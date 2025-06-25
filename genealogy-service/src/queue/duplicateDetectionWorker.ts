import { Worker, Job } from "bullmq";
import { Person } from "../models/Person";
import { MergeSuggestion } from "../models/MergeSuggestion";
import mongoose from "mongoose";
import { createNotification } from "../services/notificationService";

// Dummy fuzzy match function (replace with real logic)
function fuzzyMatch(newPerson: any, existingPerson: any): number {
  // Example: match on name similarity, birthdate, etc.
  let score = 0;
  if (
    newPerson.firstName &&
    existingPerson.firstName &&
    newPerson.firstName === existingPerson.firstName
  )
    score += 0.4;
  if (
    newPerson.lastName &&
    existingPerson.lastName &&
    newPerson.lastName === existingPerson.lastName
  )
    score += 0.4;
  if (
    newPerson.dateOfBirth &&
    existingPerson.dateOfBirth &&
    newPerson.dateOfBirth.getTime() === existingPerson.dateOfBirth.getTime()
  )
    score += 0.2;
  return score;
}

async function getPreviewTree(personId: mongoose.Types.ObjectId) {
  // Fetch a small subtree for preview (e.g., person, parents, children, spouses)
  const person = await Person.findById(personId).lean();
  // Add more logic as needed
  return person;
}

export const duplicateDetectionWorker = new Worker(
  "duplicate-detection",
  async (job: Job) => {
    const { newPersonId, createdBy } = job.data;
    const newPerson = await Person.findById(newPersonId).lean();
    if (!newPerson) return;
    const candidates = await Person.find({
      _id: { $ne: newPersonId },
      familyTreeId: newPerson.familyTreeId,
    }).lean();
    for (const candidate of candidates) {
      const confidence = fuzzyMatch(newPerson, candidate);
      if (confidence > 0.7) {
        // Threshold for suggestion
        const previewTree = await getPreviewTree(newPersonId);
        await MergeSuggestion.create({
          newPersonId,
          existingPersonId: candidate._id,
          confidence,
          createdBy,
          notifiedUsers: [createdBy].filter(Boolean), // Only notify creator for now
          previewTree,
        });
        // Notify users (in-app notification framework)
        const notifiedUsers = [createdBy].filter(Boolean); // Only notify creator for now
        for (const userId of notifiedUsers) {
          await createNotification({
            userId: userId.toString(),
            type: "merge_suggestion",
            message: `Possible duplicate detected for person ${newPersonId}`,
            data: {
              newPersonId,
              existingPersonId: candidate._id,
              confidence,
            },
          });
        }
      }
    }
  }
);
