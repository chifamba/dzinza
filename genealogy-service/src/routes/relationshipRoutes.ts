import express, { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import mongoose from "mongoose";
import { Person, IPerson } from "../models/Person.js";
import { FamilyTree, IFamilyTree } from "../models/FamilyTree.js";
import {
  Relationship,
  IRelationship,
  RelationshipType,
  ParentalRole,
  SpousalStatus,
} from "../models/Relationship.js";
import { logger } from "../utils/logger";

const router = express.Router({ mergeParams: true });

const relationshipValidationRules = [
  body("person1Id")
    .isMongoId()
    .withMessage("person1Id must be a valid Mongo ID."),
  body("person2Id")
    .isMongoId()
    .withMessage("person2Id must be a valid Mongo ID.")
    .custom((value, { req }) => {
      if (value === req.body.person1Id) {
        throw new Error("person2Id cannot be the same as person1Id.");
      }
      return true;
    }),
  body("type")
    .isIn(Object.values(RelationshipType))
    .withMessage(
      `Invalid relationship type. Must be one of: ${Object.values(
        RelationshipType
      ).join(", ")}`
    ),

  body("parentalRole")
    .optional()
    .if(
      body("type").isIn([
        RelationshipType.ParentChild,
        RelationshipType.GuardianChild,
      ])
    )
    .notEmpty()
    .withMessage(
      "parentalRole is required for ParentChild or GuardianChild relationships."
    )
    .isIn(Object.values(ParentalRole))
    .withMessage(
      `Invalid parentalRole. Must be one of: ${Object.values(ParentalRole).join(
        ", "
      )}`
    ),

  body("status")
    .optional()
    .if(body("type").isIn([RelationshipType.Spousal]))
    .notEmpty()
    .withMessage("status is required for Spousal relationships.")
    .isIn(Object.values(SpousalStatus))
    .withMessage(
      `Invalid spousal status. Must be one of: ${Object.values(
        SpousalStatus
      ).join(", ")}`
    ),

  body("startDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid startDate format."),
  body("endDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid endDate format."),

  body("events").optional().isArray().withMessage("events must be an array."),
  body("events.*.eventType")
    .if(body("events").exists().isArray({ min: 1 }))
    .notEmpty()
    .isString()
    .withMessage("Each event must have an eventType."),
  body("events.*.date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid event date format."),
  body("events.*.place").optional().isString().trim(),
  body("events.*.description").optional().isString().trim(),

  body("notes").optional().isString().trim(),
];

/**
 * @swagger
 * /api/family-trees/{treeId}/relationships:
 *   post:
 *     summary: Create a new relationship within a family tree.
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RelationshipInput'
 *     responses:
 *       201:
 *         description: Relationship created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Relationship'
 *       400:
 *         description: Invalid input.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Family tree, person1, or person2 not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/relationships",
  relationshipValidationRules,
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId } = req.params;
    const userId = req.user?.id; // Assuming authMiddleware sets req.user

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    const {
      person1Id,
      person2Id,
      type,
      parentalRole,
      status,
      startDate,
      endDate,
      events,
      notes,
    } = req.body;

    try {
      const familyTree = (await FamilyTree.findById(
        treeId
      )) as IFamilyTree | null;
      if (!familyTree) {
        return res.status(404).json({ error: "Family tree not found." });
      }

      if (!familyTree.canUserEdit(userId)) {
        return res
          .status(403)
          .json({
            error:
              "Access denied: You do not have permission to edit this family tree.",
          });
      }

      const [person1Doc, person2Doc] = await Promise.all([
        Person.findOne({ _id: person1Id, familyTreeId: treeId }),
        Person.findOne({ _id: person2Id, familyTreeId: treeId }),
      ]);

      if (!person1Doc) {
        return res
          .status(404)
          .json({
            error: `Person with ID ${person1Id} not found in this family tree.`,
          });
      }
      if (!person2Doc) {
        return res
          .status(404)
          .json({
            error: `Person with ID ${person2Id} not found in this family tree.`,
          });
      }

      const relationshipData: Partial<IRelationship> = {
        familyTreeId: new mongoose.Types.ObjectId(treeId),
        person1Id: new mongoose.Types.ObjectId(person1Id),
        person2Id: new mongoose.Types.ObjectId(person2Id),
        type,
        notes,
        events: events || [],
      };

      if (
        type === RelationshipType.ParentChild ||
        type === RelationshipType.GuardianChild
      ) {
        relationshipData.parentalRole = parentalRole;
      }
      if (type === RelationshipType.Spousal) {
        relationshipData.status = status;
        if (startDate) relationshipData.startDate = startDate;
        if (endDate) relationshipData.endDate = endDate;
      }

      const newRelationship = new Relationship(relationshipData);
      await newRelationship.save();

      // Denormalization
      if (type === RelationshipType.Spousal && status) {
        // Update person1.spouses
        const spouseLink1 = {
          spouseId: person2Doc._id,
          relationshipType: status,
          startDate,
          endDate,
          _id: newRelationship._id,
        };
        const existingSpouseIndex1 = person1Doc.spouses.findIndex(
          (s) =>
            s.spouseId.equals(person2Doc._id) && s.relationshipType === status
        );
        if (existingSpouseIndex1 > -1)
          person1Doc.spouses[existingSpouseIndex1] = spouseLink1;
        else person1Doc.spouses.push(spouseLink1);

        // Update person2.spouses
        const spouseLink2 = {
          spouseId: person1Doc._id,
          relationshipType: status,
          startDate,
          endDate,
          _id: newRelationship._id,
        };
        const existingSpouseIndex2 = person2Doc.spouses.findIndex(
          (s) =>
            s.spouseId.equals(person1Doc._id) && s.relationshipType === status
        );
        if (existingSpouseIndex2 > -1)
          person2Doc.spouses[existingSpouseIndex2] = spouseLink2;
        else person2Doc.spouses.push(spouseLink2);
      } else if (
        type === RelationshipType.Sibling ||
        type === RelationshipType.HalfSibling ||
        type === RelationshipType.StepSibling ||
        type === RelationshipType.AdoptiveSibling ||
        type === RelationshipType.FosterSibling
      ) {
        // Update person1.siblings
        const siblingLink1 = {
          siblingId: person2Doc._id,
          relationshipType: type,
          _id: newRelationship._id,
        };
        const existingSiblingIndex1 = person1Doc.siblings.findIndex(
          (s) =>
            s.siblingId.equals(person2Doc._id) && s.relationshipType === type
        );
        if (existingSiblingIndex1 > -1)
          person1Doc.siblings[existingSiblingIndex1] = siblingLink1;
        else person1Doc.siblings.push(siblingLink1);

        // Update person2.siblings
        const siblingLink2 = {
          siblingId: person1Doc._id,
          relationshipType: type,
          _id: newRelationship._id,
        };
        const existingSiblingIndex2 = person2Doc.siblings.findIndex(
          (s) =>
            s.siblingId.equals(person1Doc._id) && s.relationshipType === type
        );
        if (existingSiblingIndex2 > -1)
          person2Doc.siblings[existingSiblingIndex2] = siblingLink2;
        else person2Doc.siblings.push(siblingLink2);
      }
      // Note: Denormalization for ParentChild (e.g. updating biologicalMother/Father on child)
      // is typically handled when creating/updating the CHILD person, not here.
      // This endpoint focuses on creating the Relationship document and denormalizing spousal/sibling links.

      await person1Doc.save();
      await person2Doc.save();

      const populatedRelationship = await Relationship.findById(
        newRelationship._id
      )
        .populate("person1Id", "firstName lastName uniqueId")
        .populate("person2Id", "firstName lastName uniqueId")
        .exec();

      logger.info("Relationship created successfully.", {
        userId,
        treeId,
        relationshipId: newRelationship._id,
        type,
        correlationId: req.correlationId,
      });
      res.status(201).json(populatedRelationship);
    } catch (error) {
      const err = error as Error;
      // Check for unique index violation on RelationshipSchema if applicable
      if (
        err.message.includes("E11000 duplicate key error") &&
        err.message.includes("familyTreeId_1_person1Id_1_person2Id_1_type_1")
      ) {
        logger.warn("Attempted to create a duplicate relationship.", {
          userId,
          treeId,
          person1Id,
          person2Id,
          type,
          correlationId: req.correlationId,
        });
        return res
          .status(400)
          .json({
            error:
              "This relationship type already exists between these two people in this tree.",
          });
      }
      logger.error("Error creating relationship:", {
        userId,
        treeId,
        error: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
      });
      res.status(500).json({ error: "Failed to create relationship." });
    }
  }
);

/**
 * @swagger
 * /api/family-trees/{treeId}/relationships/{relationshipId}:
 *   get:
 *     summary: Get a specific relationship by ID within a family tree.
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree.
 *       - in: path
 *         name: relationshipId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the relationship to retrieve.
 *     responses:
 *       200:
 *         description: Detailed information about the relationship.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Relationship'
 *       400:
 *         description: Invalid ID format.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Family tree or relationship not found.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/relationships/:relationshipId",
  [
    param("relationshipId")
      .isMongoId()
      .withMessage("Invalid Relationship ID format."),
    // treeId is implicitly validated by being a param in the parent router (familyTreeRoutes)
    // and its own validation there.
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, relationshipId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    try {
      const familyTree = (await FamilyTree.findById(
        treeId
      )) as IFamilyTree | null;
      if (!familyTree) {
        logger.warn("FamilyTree not found for relationship retrieval.", {
          userId,
          treeId,
          relationshipId,
          correlationId: req.correlationId,
        });
        return res.status(404).json({ error: "Family tree not found." });
      }

      if (!familyTree.canUserView(userId)) {
        logger.warn(
          "User lacks permission to view family tree for relationship retrieval.",
          { userId, treeId, relationshipId, correlationId: req.correlationId }
        );
        return res
          .status(403)
          .json({
            error:
              "Access denied: You do not have permission to view this family tree.",
          });
      }

      const relationship = await Relationship.findOne({
        _id: relationshipId,
        familyTreeId: treeId,
      })
        .populate(
          "person1Id",
          "firstName lastName profilePhotoUrl gender uniqueId dateOfBirth isLiving"
        )
        .populate(
          "person2Id",
          "firstName lastName profilePhotoUrl gender uniqueId dateOfBirth isLiving"
        )
        .exec();

      if (!relationship) {
        logger.warn("Relationship not found in specified family tree.", {
          userId,
          treeId,
          relationshipId,
          correlationId: req.correlationId,
        });
        return res
          .status(404)
          .json({ error: "Relationship not found in this family tree." });
      }

      logger.info("Relationship retrieved successfully.", {
        userId,
        treeId,
        relationshipId,
        correlationId: req.correlationId,
      });
      res.json(relationship);
    } catch (error) {
      const err = error as Error;
      logger.error("Error retrieving relationship:", {
        userId,
        treeId,
        relationshipId,
        error: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
      });
      res.status(500).json({ error: "Failed to retrieve relationship." });
    }
  }
);

const relationshipUpdateValidationRules = [
  body("type")
    .optional()
    .isIn(Object.values(RelationshipType))
    .withMessage(
      `Invalid relationship type. Must be one of: ${Object.values(
        RelationshipType
      ).join(", ")}`
    ),
  body("parentalRole")
    .optional()
    // No easy way to say "required if type is ParentChild" for an *optional* type field during update.
    // This might need to be handled in the route logic or by making type non-updatable.
    // For now, just validate if present.
    .isIn(Object.values(ParentalRole))
    .withMessage(
      `Invalid parentalRole. Must be one of: ${Object.values(ParentalRole).join(
        ", "
      )}`
    ),
  body("status")
    .optional()
    .isIn(Object.values(SpousalStatus))
    .withMessage(
      `Invalid spousal status. Must be one of: ${Object.values(
        SpousalStatus
      ).join(", ")}`
    ),
  body("startDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid startDate format."),
  body("endDate")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid endDate format."),
  body("events").optional().isArray().withMessage("events must be an array."),
  body("events.*.eventType")
    .if(body("events").exists().isArray({ min: 1 }))
    .notEmpty()
    .isString()
    .withMessage("Each event must have an eventType."),
  body("events.*.date")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate()
    .withMessage("Invalid event date format."),
  body("events.*.place").optional().isString().trim(),
  body("events.*.description").optional().isString().trim(),
  body("notes").optional({ nullable: true }).isString().trim(), // Allow null to unset notes

  // Prevent updates to person1Id and person2Id
  body("person1Id").custom((value) => {
    if (value !== undefined) throw new Error("person1Id cannot be updated.");
    return true;
  }),
  body("person2Id").custom((value) => {
    if (value !== undefined) throw new Error("person2Id cannot be updated.");
    return true;
  }),
];

/**
 * @swagger
 * /api/family-trees/{treeId}/relationships/{relationshipId}:
 *   put:
 *     summary: Update a specific relationship by ID within a family tree.
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree.
 *       - in: path
 *         name: relationshipId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the relationship to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RelationshipUpdateInput' # Define this schema
 *     responses:
 *       200:
 *         description: Relationship updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Relationship'
 *       400:
 *         description: Invalid input or attempt to change immutable fields (type, person1Id, person2Id).
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Family tree or relationship not found.
 *       500:
 *         description: Internal server error.
 */
router.put(
  "/relationships/:relationshipId",
  [
    param("relationshipId")
      .isMongoId()
      .withMessage("Invalid Relationship ID format."),
    ...relationshipUpdateValidationRules,
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, relationshipId } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    try {
      const familyTree = (await FamilyTree.findById(
        treeId
      )) as IFamilyTree | null;
      if (!familyTree) {
        return res.status(404).json({ error: "Family tree not found." });
      }

      if (!familyTree.canUserEdit(userId)) {
        return res
          .status(403)
          .json({
            error:
              "Access denied: You do not have permission to edit this family tree.",
          });
      }

      const relationship = await Relationship.findOne({
        _id: relationshipId,
        familyTreeId: treeId,
      });
      if (!relationship) {
        return res
          .status(404)
          .json({ error: "Relationship not found in this family tree." });
      }

      // Simplified approach: Disallow 'type' change
      if (updates.type && updates.type !== relationship.type) {
        return res
          .status(400)
          .json({
            error:
              "Relationship type cannot be changed. Please delete and create a new relationship.",
          });
      }
      // Fields like person1Id and person2Id are blocked by validation rules.

      const oldStatus =
        relationship.type === RelationshipType.Spousal
          ? relationship.status
          : undefined;
      const oldStartDate = relationship.startDate;
      const oldEndDate = relationship.endDate;

      // Apply updates
      if (
        updates.hasOwnProperty("parentalRole") &&
        (relationship.type === RelationshipType.ParentChild ||
          relationship.type === RelationshipType.GuardianChild)
      ) {
        relationship.parentalRole = updates.parentalRole;
      } else if (updates.hasOwnProperty("parentalRole")) {
        // Trying to set parentalRole for a non-parental relationship type
        return res
          .status(400)
          .json({
            error: `parentalRole is not applicable for relationship type ${relationship.type}`,
          });
      }

      if (
        updates.hasOwnProperty("status") &&
        relationship.type === RelationshipType.Spousal
      ) {
        relationship.status = updates.status;
      } else if (updates.hasOwnProperty("status")) {
        return res
          .status(400)
          .json({
            error: `status is not applicable for relationship type ${relationship.type}`,
          });
      }

      if (updates.hasOwnProperty("startDate"))
        relationship.startDate = updates.startDate;
      if (updates.hasOwnProperty("endDate"))
        relationship.endDate = updates.endDate;
      if (updates.hasOwnProperty("events"))
        relationship.events = updates.events; // Full array replacement
      if (updates.hasOwnProperty("notes")) {
        relationship.notes =
          updates.notes === null || updates.notes === ""
            ? undefined
            : updates.notes;
      }

      await relationship.save();

      // Denormalization logic for Spousal relationships if relevant fields changed
      if (relationship.type === RelationshipType.Spousal) {
        const newStatus = relationship.status; // Status after update
        const newStartDate = relationship.startDate;
        const newEndDate = relationship.endDate;

        // Check if any spousal-defining field actually changed
        let spousalInfoChanged = false;
        if (
          oldStatus !== newStatus ||
          oldStartDate?.getTime() !== newStartDate?.getTime() || // Compare date times
          oldEndDate?.getTime() !== newEndDate?.getTime()
        ) {
          spousalInfoChanged = true;
        }

        if (spousalInfoChanged) {
          const [person1Doc, person2Doc] = await Promise.all([
            Person.findById(relationship.person1Id),
            Person.findById(relationship.person2Id),
          ]);

          if (person1Doc && person2Doc) {
            // Update person1.spouses
            const spouseLink1 = person1Doc.spouses.find((s) =>
              s._id?.equals(relationship._id)
            );
            if (spouseLink1) {
              spouseLink1.relationshipType = newStatus as string; // Cast as SpousalStatus is validated
              spouseLink1.startDate = newStartDate;
              spouseLink1.endDate = newEndDate;
            } else {
              // This case should ideally not happen if relationship creation correctly denormalized.
              // However, to be robust, add it if missing.
              person1Doc.spouses.push({
                _id: relationship._id, // Link by relationship's specific ID
                spouseId: person2Doc._id,
                relationshipType: newStatus as string,
                startDate: newStartDate,
                endDate: newEndDate,
              });
            }

            // Update person2.spouses
            const spouseLink2 = person2Doc.spouses.find((s) =>
              s._id?.equals(relationship._id)
            );
            if (spouseLink2) {
              spouseLink2.relationshipType = newStatus as string;
              spouseLink2.startDate = newStartDate;
              spouseLink2.endDate = newEndDate;
            } else {
              person2Doc.spouses.push({
                _id: relationship._id,
                spouseId: person1Doc._id,
                relationshipType: newStatus as string,
                startDate: newStartDate,
                endDate: newEndDate,
              });
            }
            await person1Doc.save();
            await person2Doc.save();
          }
        }
      }
      // No denormalization for Sibling type changes here as type is immutable.
      // If other fields on Sibling relationships were denormalized (e.g. notes), that logic would go here.

      const populatedRelationship = await Relationship.findById(
        relationship._id
      )
        .populate(
          "person1Id",
          "firstName lastName uniqueId profilePhotoUrl gender"
        )
        .populate(
          "person2Id",
          "firstName lastName uniqueId profilePhotoUrl gender"
        )
        .exec();

      logger.info("Relationship updated successfully.", {
        userId,
        treeId,
        relationshipId,
        correlationId: req.correlationId,
      });
      res.json(populatedRelationship);
    } catch (error) {
      const err = error as Error;
      logger.error("Error updating relationship:", {
        userId,
        treeId,
        relationshipId,
        error: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
      });
      res.status(500).json({ error: "Failed to update relationship." });
    }
  }
);

/**
 * @swagger
 * /api/family-trees/{treeId}/relationships/{relationshipId}:
 *   delete:
 *     summary: Delete a specific relationship by ID within a family tree.
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree.
 *       - in: path
 *         name: relationshipId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the relationship to delete.
 *     responses:
 *       204:
 *         description: Relationship deleted successfully.
 *       400:
 *         description: Invalid ID format.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Family tree or relationship not found.
 *       500:
 *         description: Internal server error.
 */
router.delete(
  "/relationships/:relationshipId",
  [
    param("relationshipId")
      .isMongoId()
      .withMessage("Invalid Relationship ID format."),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, relationshipId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    try {
      const familyTree = (await FamilyTree.findById(
        treeId
      )) as IFamilyTree | null;
      if (!familyTree) {
        return res.status(404).json({ error: "Family tree not found." });
      }

      if (!familyTree.canUserEdit(userId)) {
        return res
          .status(403)
          .json({
            error:
              "Access denied: You do not have permission to edit this family tree.",
          });
      }

      const relationshipToDelete = await Relationship.findOne({
        _id: relationshipId,
        familyTreeId: treeId,
      });
      if (!relationshipToDelete) {
        return res
          .status(404)
          .json({ error: "Relationship not found in this family tree." });
      }

      const { person1Id, person2Id, type, status, parentalRole } =
        relationshipToDelete;

      const person1Doc = (await Person.findById(person1Id)) as IPerson | null;
      const person2Doc = (await Person.findById(person2Id)) as IPerson | null;

      // Denormalization
      if (person1Doc) {
        if (type === RelationshipType.Spousal) {
          person1Doc.spouses = person1Doc.spouses.filter(
            (s) => !s._id?.equals(relationshipToDelete._id)
          );
        } else if (
          type === RelationshipType.Sibling ||
          type === RelationshipType.HalfSibling ||
          type === RelationshipType.StepSibling ||
          type === RelationshipType.AdoptiveSibling ||
          type === RelationshipType.FosterSibling
        ) {
          person1Doc.siblings = person1Doc.siblings.filter(
            (s) => !s._id?.equals(relationshipToDelete._id)
          );
        }
        // No specific denorm from p1's perspective for ParentChild on p1 itself in current schema
      }

      if (person2Doc) {
        if (type === RelationshipType.Spousal) {
          person2Doc.spouses = person2Doc.spouses.filter(
            (s) => !s._id?.equals(relationshipToDelete._id)
          );
        } else if (
          type === RelationshipType.Sibling ||
          type === RelationshipType.HalfSibling ||
          type === RelationshipType.StepSibling ||
          type === RelationshipType.AdoptiveSibling ||
          type === RelationshipType.FosterSibling
        ) {
          person2Doc.siblings = person2Doc.siblings.filter(
            (s) => !s._id?.equals(relationshipToDelete._id)
          );
        } else if (
          type === RelationshipType.ParentChild ||
          type === RelationshipType.GuardianChild
        ) {
          // person1Id is the parent, person2Id is the child
          if (
            parentalRole === ParentalRole.BiologicalMother &&
            person2Doc.biologicalMother?.equals(person1Id)
          ) {
            person2Doc.biologicalMother = undefined;
          }
          if (
            parentalRole === ParentalRole.BiologicalFather &&
            person2Doc.biologicalFather?.equals(person1Id)
          ) {
            person2Doc.biologicalFather = undefined;
          }
          // Remove from legalParents array
          // This assumes the parentalRole implies it was a legal parent link we stored.
          // Or, if the relationshipId itself was stored in legalParents. For now, match by parentId.
          person2Doc.legalParents = person2Doc.legalParents.filter(
            (lp) => !lp.parentId.equals(person1Id)
          );
        }
      }

      if (person1Doc) await person1Doc.save();
      if (person2Doc) await person2Doc.save();

      // Delete the relationship itself
      await Relationship.findByIdAndDelete(relationshipId);

      logger.info("Relationship deleted successfully.", {
        userId,
        treeId,
        relationshipId,
        correlationId: req.correlationId,
      });
      res.status(204).send();
    } catch (error) {
      const err = error as Error;
      logger.error("Error deleting relationship:", {
        userId,
        treeId,
        relationshipId,
        error: err.message,
        stack: err.stack,
        correlationId: req.correlationId,
      });
      res.status(500).json({ error: "Failed to delete relationship." });
    }
  }
);

export default router;
