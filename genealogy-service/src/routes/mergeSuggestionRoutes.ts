import express, { Request, Response } from "express";
import { MergeSuggestion } from "../models/MergeSuggestion";
import { Person } from "../models/Person";
import { PersonHistory } from "../models/PersonHistory";
import { FamilyTree } from "../models/FamilyTree";

const router = express.Router();

// List merge suggestions for a user (admin or notified user)
router.get("/merge-suggestions", async (req: Request, res: Response) => {
  const userId = req.user?._id || req.user?.id || req.user;
  const isAdmin = req.user?.role === "admin";
  const filter = isAdmin ? {} : { notifiedUsers: userId };
  const suggestions = await MergeSuggestion.find(filter)
    .sort({ createdAt: -1 })
    .lean();
  res.json(suggestions);
});

// Accept a merge suggestion
router.post(
  "/merge-suggestions/:id/accept",
  async (req: Request, res: Response) => {
    const suggestion = await MergeSuggestion.findById(req.params.id);
    if (!suggestion || suggestion.status !== "pending")
      return res
        .status(404)
        .json({ error: "Suggestion not found or already handled." });
    const newPerson = await Person.findById(suggestion.newPersonId);
    const existingPerson = await Person.findById(suggestion.existingPersonId);
    if (!newPerson || !existingPerson)
      return res.status(404).json({ error: "Person not found." });

    // --- Begin advanced merge logic ---
    // Helper to merge arrays without duplicates
    function mergeUnique(arr1: any[], arr2: any[], key: string) {
      const map = new Map();
      arr1.concat(arr2).forEach((item) => {
        if (item && item[key]) map.set(item[key].toString(), item);
      });
      return Array.from(map.values());
    }

    // Merge fields: prefer non-empty, non-null, more specific, or more recent data
    const merged: any = { ...existingPerson.toObject() };
    const newObj = newPerson.toObject();
    for (const field of Object.keys(newObj)) {
      if (["_id", "createdAt", "updatedAt", "__v", "uniqueId"].includes(field))
        continue;
      if (
        Array.isArray((newObj as any)[field]) &&
        Array.isArray((merged as any)[field])
      ) {
        // Merge arrays (identifiers, legalParents, spouses, siblings, traditionalTitles)
        (merged as any)[field] = mergeUnique(
          (merged as any)[field],
          (newObj as any)[field],
          "_id"
        );
      } else if (
        typeof (newObj as any)[field] === "object" &&
        (newObj as any)[field] !== null &&
        (merged as any)[field]
      ) {
        // Deep merge for privacySettings, etc.
        (merged as any)[field] = {
          ...(merged as any)[field],
          ...(newObj as any)[field],
        };
      } else if (
        ((merged as any)[field] === undefined ||
          (merged as any)[field] === null ||
          (merged as any)[field] === "" ||
          (merged as any)[field] === "Unknown") &&
        (newObj as any)[field] !== undefined &&
        (newObj as any)[field] !== null &&
        (newObj as any)[field] !== "" &&
        (newObj as any)[field] !== "Unknown"
      ) {
        (merged as any)[field] = (newObj as any)[field];
      }
    }

    // Merge notes
    if (newObj.notes && merged.notes && newObj.notes !== merged.notes) {
      merged.notes = merged.notes + "\n" + newObj.notes;
    } else if (newObj.notes && !merged.notes) {
      merged.notes = newObj.notes;
    }

    // Merge profilePhotoUrl: prefer existing, else new
    if (!merged.profilePhotoUrl && newObj.profilePhotoUrl) {
      merged.profilePhotoUrl = newObj.profilePhotoUrl;
    }

    // Merge relationships: ensure all unique links are preserved
    merged.spouses = mergeUnique(
      merged.spouses || [],
      newObj.spouses || [],
      "spouseId"
    );
    merged.siblings = mergeUnique(
      merged.siblings || [],
      newObj.siblings || [],
      "siblingId"
    );
    merged.legalParents = mergeUnique(
      merged.legalParents || [],
      newObj.legalParents || [],
      "parentId"
    );
    merged.identifiers = mergeUnique(
      merged.identifiers || [],
      newObj.identifiers || [],
      "value"
    );
    merged.traditionalTitles = Array.from(
      new Set([
        ...(merged.traditionalTitles || []),
        ...(newObj.traditionalTitles || []),
      ])
    );

    // Prefer more precise birth/death dates
    if (
      newObj.dateOfBirth &&
      (!merged.dateOfBirth || merged.isBirthDateEstimated)
    ) {
      merged.dateOfBirth = newObj.dateOfBirth;
      merged.isBirthDateEstimated = !!newObj.isBirthDateEstimated;
    }
    if (
      newObj.dateOfDeath &&
      (!merged.dateOfDeath || merged.isDeathDateEstimated)
    ) {
      merged.dateOfDeath = newObj.dateOfDeath;
      merged.isDeathDateEstimated = !!newObj.isDeathDateEstimated;
    }

    // Save merged data
    await Person.findByIdAndUpdate(existingPerson._id, merged, { new: true });
    await newPerson.deleteOne();
    suggestion.status = "accepted";
    await suggestion.save();
    // Log history
    await PersonHistory.create({
      personId: existingPerson._id,
      version: Date.now(),
      data: merged,
      changedBy: req.user?._id || req.user?.id || req.user,
      changeType: "merge",
    });

    // If the persons are from different trees, merge the trees
    if (
      newPerson.familyTreeId.toString() !==
      existingPerson.familyTreeId.toString()
    ) {
      const sourceTreeId = newPerson.familyTreeId;
      const targetTreeId = existingPerson.familyTreeId;
      // Move all persons from sourceTreeId to targetTreeId
      await Person.updateMany(
        { familyTreeId: sourceTreeId },
        { $set: { familyTreeId: targetTreeId } }
      );
      // Optionally, merge collaborators, stats, etc.
      const sourceTree = await FamilyTree.findById(sourceTreeId);
      const targetTree = await FamilyTree.findById(targetTreeId);
      if (sourceTree && targetTree) {
        // Merge collaborators (avoid duplicates)
        const existingUserIds = new Set(
          targetTree.collaborators.map((c) => c.userId)
        );
        for (const collab of sourceTree.collaborators) {
          if (!existingUserIds.has(collab.userId)) {
            targetTree.collaborators.push(collab);
          }
        }
        // Merge stats
        targetTree.statistics.totalPersons +=
          sourceTree.statistics.totalPersons;
        // Optionally, merge other fields as needed
        await targetTree.save();
        // Remove the source tree
        await sourceTree.deleteOne();
      }
    }

    res.json({ success: true });
  }
);

// Decline a merge suggestion
router.post(
  "/merge-suggestions/:id/decline",
  async (req: Request, res: Response) => {
    const suggestion = await MergeSuggestion.findById(req.params.id);
    if (!suggestion || suggestion.status !== "pending")
      return res
        .status(404)
        .json({ error: "Suggestion not found or already handled." });
    suggestion.status = "declined";
    await suggestion.save();
    res.json({ success: true });
  }
);

// List person history
router.get("/persons/:id/history", async (req: Request, res: Response) => {
  const history = await PersonHistory.find({ personId: req.params.id })
    .sort({ version: -1 })
    .lean();
  res.json(history);
});

// Revert person to a previous version
router.post("/persons/:id/revert", async (req: Request, res: Response) => {
  const { version } = req.body;
  const entry = await PersonHistory.findOne({
    personId: req.params.id,
    version,
  });
  if (!entry) return res.status(404).json({ error: "Version not found." });
  await Person.findByIdAndUpdate(req.params.id, entry.data);
  await PersonHistory.create({
    personId: req.params.id,
    version: Date.now(),
    data: entry.data,
    changedBy: req.user?._id || req.user?.id || req.user,
    changeType: "revert",
  });
  res.json({ success: true });
});

export default router;
