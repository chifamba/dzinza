import express, { Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Person, IPerson } from '../models/Person.js'; // Assuming IPerson is exported
import { FamilyTree, IFamilyTree } from '../models/FamilyTree.js'; // Assuming IFamilyTree is exported
import { Relationship } from '../models/Relationship.js'; // Import Relationship model
import { logger } from '../../../../src/shared/utils/logger.js'; // Adjust path as needed
// import { authMiddleware } from '../../../../src/shared/middleware/auth.js'; // Assuming authMiddleware sets req.user

// Use mergeParams to access :treeId from the parent router (familyTreeRoutes)
const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * /api/family-trees/{treeId}/persons:
 *   post:
 *     summary: Create a new person within a specific family tree.
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree this person will belong to.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonInput' # Define PersonInput in Swagger components
 *     responses:
 *       201:
 *         description: Person created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       400:
 *         description: Invalid input (validation errors or invalid treeId/parent IDs).
 *       403:
 *         description: Access denied (user cannot edit this family tree).
 *       404:
 *         description: Family tree not found or specified parent(s) not found.
 *       500:
 *         description: Internal server error.
 */
router.post('/persons',
  [
    // treeId is implicitly validated by being a param in the parent router, but good to have if used directly
    // param('treeId').isMongoId().withMessage('Invalid Family Tree ID format.'),

    body('firstName').optional().trim().isString().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isString().isLength({ min: 1, max: 100 }),
    body('nickName').optional().trim().isString().isLength({ max: 100 }),
    body('gender').optional().isIn(['Male', 'Female', 'Non-binary', 'Other', 'Unknown']),

    body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid Date of Birth.'),
    body('placeOfBirth').optional().trim().isString(),
    body('isBirthDateEstimated').optional().isBoolean(),

    body('dateOfDeath').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid Date of Death.'),
    body('placeOfDeath').optional().trim().isString(),
    body('isDeathDateEstimated').optional().isBoolean(),
    body('causeOfDeath').optional().trim().isString(),

    // Identifiers
    body('identifiers').optional().isArray(),
    body('identifiers.*.type').if(body('identifiers').exists()).isIn(['NationalID', 'Passport', 'DriverLicense', 'BirthCertificate', 'Email', 'Phone', 'Other']).withMessage('Invalid identifier type.'),
    body('identifiers.*.value').if(body('identifiers').exists()).isString().notEmpty().withMessage('Identifier value cannot be empty.'),
    body('identifiers.*.verificationStatus').optional().isIn(['Verified', 'Unverified', 'Pending']),

    // Basic Parent IDs (ObjectId strings)
    body('biologicalMotherId').optional().isMongoId().withMessage('Invalid biological mother ID format.'),
    body('biologicalFatherId').optional().isMongoId().withMessage('Invalid biological father ID format.'),

    // Legal Parents (array of objects with parentId and relationshipType)
    body('legalParents').optional().isArray(),
    body('legalParents.*.parentId').if(body('legalParents').exists()).isMongoId().withMessage('Invalid legal parent ID format.'),
    body('legalParents.*.relationshipType').if(body('legalParents').exists()).isIn(['Adoptive', 'Guardian', 'Foster', 'Step-parent', 'Other']).withMessage('Invalid legal parent relationship type.'),

    body('notes').optional().trim().isString(),
    body('profilePhotoUrl').optional().trim().isURL().withMessage('Invalid profile photo URL.'),

    body('clan').optional().trim().isString(),
    body('tribe').optional().trim().isString(),
    body('traditionalTitles').optional().isArray(),
    body('traditionalTitles.*').if(body('traditionalTitles').exists()).isString().trim(),

    body('privacySettings').optional().isObject(),
    body('privacySettings.showProfile').optional().isIn(['Public', 'FamilyTreeOnly', 'Private']),
    // Add other privacy settings fields as needed
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // `treeId` comes from `req.params` due to `mergeParams: true`
    const { treeId } = req.params;
    const userId = req.user?.id; // Assuming authMiddleware sets req.user

    if (!userId) {
        logger.warn('Attempt to create person without authenticated user.', { treeId, correlationId: req.correlationId });
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId) as IFamilyTree | null;
      if (!familyTree) {
        logger.warn('FamilyTree not found for person creation.', { userId, treeId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Family tree not found.' });
      }

      // Authorization: Check if user can edit this family tree
      if (!familyTree.canUserEdit(userId)) {
        logger.warn('User lacks permission to add person to family tree.', { userId, treeId, correlationId: req.correlationId });
        return res.status(403).json({ error: 'Access denied: You do not have permission to add persons to this tree.' });
      }

      const personData: Partial<IPerson> = {
        ...req.body,
        familyTreeId: treeId, // Essential link
        // uniqueId will be generated by Mongoose schema default
      };

      // Validate existence of biological parent IDs if provided
      if (personData.biologicalMotherId) {
        const mother = await Person.findOne({ _id: personData.biologicalMotherId, familyTreeId: treeId });
        if (!mother) {
          return res.status(400).json({ error: `Biological mother with ID ${personData.biologicalMotherId} not found in this tree.` });
        }
      }
      if (personData.biologicalFatherId) {
        const father = await Person.findOne({ _id: personData.biologicalFatherId, familyTreeId: treeId });
        if (!father) {
          return res.status(400).json({ error: `Biological father with ID ${personData.biologicalFatherId} not found in this tree.` });
        }
      }
      // Validate legal parent IDs
      if (personData.legalParents && personData.legalParents.length > 0) {
        for (const legalParent of personData.legalParents) {
            const parentDoc = await Person.findOne({ _id: legalParent.parentId, familyTreeId: treeId });
            if (!parentDoc) {
                return res.status(400).json({ error: `Legal parent with ID ${legalParent.parentId} not found in this tree.` });
            }
        }
      }


      const newPerson = new Person(personData);
      await newPerson.save();

      // Update family tree statistics (simple increment)
      // More complex stats (generations, etc.) might need a dedicated service or hooks
      familyTree.statistics.totalPersons = (familyTree.statistics.totalPersons || 0) + 1;
      await familyTree.save();

      logger.info('New person created in family tree.', { userId, treeId, personId: newPerson._id, correlationId: req.correlationId });
      res.status(201).json(newPerson);

    } catch (error) {
      const err = error as Error;
      logger.error('Error creating person:', { userId, treeId, error: err.message, stack: err.stack, correlationId: req.correlationId });
      // Check for duplicate key error for uniqueId if not using default ObjectId toHexString()
      if (err.message.includes('E11000 duplicate key error') && err.message.includes('uniqueId')) {
          return res.status(400).json({ error: 'A person with this uniqueId already exists.'});
      }
      res.status(500).json({ error: 'Failed to create person.' });
    }
  }
);


/**
 * @swagger
 * /api/family-trees/{treeId}/persons/{personId}:
 *   get:
 *     summary: Get a specific person by ID within a family tree.
 *     tags: [Persons]
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
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the person to retrieve.
 *     responses:
 *       200:
 *         description: Detailed information about the person.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person' # Assuming Person schema includes populated fields
 *       400:
 *         description: Invalid ID format for treeId or personId.
 *       403:
 *         description: Access denied (user cannot view this family tree).
 *       404:
 *         description: Family tree or person not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/persons/:personId',
  [
    param('personId').isMongoId().withMessage('Invalid Person ID format.'),
    // treeId is implicitly validated by being a param in the parent router and its own validation there
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, personId } = req.params;
    const userId = req.user?.id; // Assuming authMiddleware sets req.user

    if (!userId) {
        logger.warn('Attempt to get person without authenticated user.', { treeId, personId, correlationId: req.correlationId });
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId) as IFamilyTree | null;
      if (!familyTree) {
        logger.warn('FamilyTree not found for person retrieval.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Family tree not found.' });
      }

      // Authorization: Check if user can view this family tree
      if (!familyTree.canUserView(userId)) {
        logger.warn('User lacks permission to view family tree for person retrieval.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(403).json({ error: 'Access denied: You do not have permission to view this family tree.' });
      }

      const person = await Person.findOne({ _id: personId, familyTreeId: treeId })
        .populate('biologicalMother', 'firstName lastName nickName profilePhotoUrl dateOfBirth dateOfDeath isLiving gender uniqueId')
        .populate('biologicalFather', 'firstName lastName nickName profilePhotoUrl dateOfBirth dateOfDeath isLiving gender uniqueId')
        .populate({
            path: 'legalParents.parentId', // Path to the ObjectId within the array of subdocuments
            select: 'firstName lastName nickName profilePhotoUrl dateOfBirth dateOfDeath isLiving gender uniqueId',
            model: 'Person' // Explicitly state the model to populate from
        })
        .populate({
            path: 'spouses.spouseId', // Path to the ObjectId within the array of subdocuments
            select: 'firstName lastName nickName profilePhotoUrl dateOfBirth dateOfDeath isLiving gender uniqueId',
            model: 'Person'
        })
        .populate({
            path: 'siblings.siblingId', // Path to the ObjectId within the array of subdocuments
            select: 'firstName lastName nickName profilePhotoUrl dateOfBirth dateOfDeath isLiving gender uniqueId',
            model: 'Person'
        })
        .exec();

      if (!person) {
        logger.warn('Person not found in specified family tree.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Person not found in this family tree.' });
      }

      // Note: The `isLiving` field on the person itself is managed by a pre-save hook.
      // For populated related persons, their `isLiving` status would also be based on their own documents.
      // If `privacySettings` on the main person document should restrict showing details of *other* living people,
      // that logic would need to be applied here by filtering the populated fields post-query if `canUserViewSensitiveInfo` type checks are needed.
      // For now, assuming if user can view the tree, they can see these populated details.

      logger.info('Person retrieved successfully.', { userId, treeId, personId, correlationId: req.correlationId });
      res.json(person);

    } catch (error) {
      const err = error as Error;
      logger.error('Error retrieving person:', { userId, treeId, personId, error: err.message, stack: err.stack, correlationId: req.correlationId });
      res.status(500).json({ error: 'Failed to retrieve person.' });
    }
  }
);


/**
 * @swagger
 * /api/family-trees/{treeId}/persons/{personId}:
 *   put:
 *     summary: Update a specific person by ID within a family tree.
 *     tags: [Persons]
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
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the person to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonUpdateInput' # Define PersonUpdateInput in Swagger components (similar to PersonInput but all fields optional)
 *     responses:
 *       200:
 *         description: Person updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 *       400:
 *         description: Invalid input (validation errors or invalid parent IDs).
 *       403:
 *         description: Access denied (user cannot edit this family tree).
 *       404:
 *         description: Family tree or person not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/persons/:personId',
  [
    param('personId').isMongoId().withMessage('Invalid Person ID format.'),
    // Validation for request body (all fields optional for PUT)
    body('firstName').optional().trim().isString().isLength({ min: 1, max: 100 }),
    body('lastName').optional().trim().isString().isLength({ min: 1, max: 100 }),
    body('nickName').optional().trim().isString().isLength({ max: 100 }),
    body('gender').optional().isIn(['Male', 'Female', 'Non-binary', 'Other', 'Unknown']),

    body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid Date of Birth.'),
    body('placeOfBirth').optional({ checkFalsy: true }).trim().isString(), // checkFalsy to allow "" to unset
    body('isBirthDateEstimated').optional().isBoolean(),

    body('dateOfDeath').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid Date of Death.'),
    body('placeOfDeath').optional({ checkFalsy: true }).trim().isString(), // checkFalsy to allow "" to unset
    body('isDeathDateEstimated').optional().isBoolean(),
    body('causeOfDeath').optional({ checkFalsy: true }).trim().isString(),

    body('isLiving').optional().isBoolean(), // Typically managed by hook, but allow override

    // Identifiers: If provided, replaces the entire array
    body('identifiers').optional().isArray(),
    body('identifiers.*.type').if(body('identifiers').exists()).isIn(['NationalID', 'Passport', 'DriverLicense', 'BirthCertificate', 'Email', 'Phone', 'Other']).withMessage('Invalid identifier type.'),
    body('identifiers.*.value').if(body('identifiers').exists()).isString().notEmpty().withMessage('Identifier value cannot be empty.'),
    body('identifiers.*.verificationStatus').optional().isIn(['Verified', 'Unverified', 'Pending']),

    // Biological Parent IDs: Allow null to unset
    body('biologicalMotherId').optional({nullable: true}).isMongoId().withMessage('Invalid biological mother ID format.'),
    body('biologicalFatherId').optional({nullable: true}).isMongoId().withMessage('Invalid biological father ID format.'),

    // Legal Parents: If provided, replaces the entire array
    body('legalParents').optional().isArray(),
    body('legalParents.*.parentId').if(body('legalParents').exists()).isMongoId().withMessage('Invalid legal parent ID format.'),
    body('legalParents.*.relationshipType').if(body('legalParents').exists()).isIn(['Adoptive', 'Guardian', 'Foster', 'Step-parent', 'Other']).withMessage('Invalid legal parent relationship type.'),

    body('notes').optional({ checkFalsy: true }).trim().isString(),
    body('profilePhotoUrl').optional({ checkFalsy: true }).trim().isURL().withMessage('Invalid profile photo URL.'),

    body('clan').optional({ checkFalsy: true }).trim().isString(),
    body('tribe').optional({ checkFalsy: true }).trim().isString(),
    body('traditionalTitles').optional().isArray(),
    body('traditionalTitles.*').if(body('traditionalTitles').exists()).isString().trim(),

    body('privacySettings').optional().isObject(),
    body('privacySettings.showProfile').optional().isIn(['Public', 'FamilyTreeOnly', 'Private']),
    // Add other privacy settings fields as needed

    // Ensure spouses and siblings are not directly updatable
    body('spouses').custom((value) => {
      if (value !== undefined) {
        throw new Error('Spouses array cannot be updated directly through this endpoint.');
      }
      return true;
    }),
    body('siblings').custom((value) => {
      if (value !== undefined) {
        throw new Error('Siblings array cannot be updated directly through this endpoint.');
      }
      return true;
    }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, personId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
        logger.warn('Attempt to update person without authenticated user.', { treeId, personId, correlationId: req.correlationId });
        return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId) as IFamilyTree | null;
      if (!familyTree) {
        logger.warn('FamilyTree not found for person update.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Family tree not found.' });
      }

      if (!familyTree.canUserEdit(userId)) {
        logger.warn('User lacks permission to edit family tree for person update.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(403).json({ error: 'Access denied: You do not have permission to edit persons in this tree.' });
      }

      const person = await Person.findOne({ _id: personId, familyTreeId: treeId });
      if (!person) {
        logger.warn('Person not found for update in specified family tree.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Person not found in this family tree.' });
      }

      const updates = req.body;

      // Validate new parent IDs if they are being changed
      if (updates.biologicalMotherId) {
        const mother = await Person.findOne({ _id: updates.biologicalMotherId, familyTreeId: treeId });
        if (!mother) return res.status(400).json({ error: `Biological mother with ID ${updates.biologicalMotherId} not found in this tree.` });
      } else if (updates.biologicalMotherId === null) { // Explicitly setting to null
        person.biologicalMother = undefined;
      }

      if (updates.biologicalFatherId) {
        const father = await Person.findOne({ _id: updates.biologicalFatherId, familyTreeId: treeId });
        if (!father) return res.status(400).json({ error: `Biological father with ID ${updates.biologicalFatherId} not found in this tree.` });
      } else if (updates.biologicalFatherId === null) {
        person.biologicalFather = undefined;
      }

      if (updates.legalParents && Array.isArray(updates.legalParents)) {
        for (const legalParent of updates.legalParents) {
          if (legalParent.parentId) {
            const parentDoc = await Person.findOne({ _id: legalParent.parentId, familyTreeId: treeId });
            if (!parentDoc) return res.status(400).json({ error: `Legal parent with ID ${legalParent.parentId} not found in this tree.` });
          } else {
            return res.status(400).json({ error: `Legal parent entry missing parentId.`});
          }
        }
        person.legalParents = updates.legalParents; // Full replacement of the array
      } else if (updates.legalParents === null) {
          person.legalParents = []; // Clear the array
      }


      // Apply updates selectively
      // Direct assignment for simple fields
      for (const key of ['firstName', 'lastName', 'nickName', 'gender', 'dateOfBirth', 'placeOfBirth', 'isBirthDateEstimated', 'dateOfDeath', 'placeOfDeath', 'isDeathDateEstimated', 'causeOfDeath', 'isLiving', 'notes', 'profilePhotoUrl', 'clan', 'tribe', 'traditionalTitles']) {
        if (updates.hasOwnProperty(key)) {
          (person as any)[key] = updates[key] === '' || updates[key] === null ? undefined : updates[key];
        }
      }

      // Handle nested objects like privacySettings (merge or replace)
      // For simplicity, full replace if provided, otherwise merge specific sub-fields if needed
      if (updates.privacySettings) {
        if (person.privacySettings) { // Merge if already exists
            for(const key in updates.privacySettings) {
                if(updates.privacySettings.hasOwnProperty(key)) {
                    (person.privacySettings as any)[key] = updates.privacySettings[key];
                }
            }
        } else { // Else, set it directly
            person.privacySettings = updates.privacySettings;
        }
      }

      // Full replacement for identifiers array if provided
      if (updates.identifiers !== undefined) {
        person.identifiers = updates.identifiers;
      }

      // Update biological parent fields if explicitly provided in updates (and not already handled by setting to null)
      if (updates.hasOwnProperty('biologicalMotherId') && updates.biologicalMotherId !== null) {
        person.biologicalMother = updates.biologicalMotherId;
      }
      if (updates.hasOwnProperty('biologicalFatherId') && updates.biologicalFatherId !== null) {
        person.biologicalFather = updates.biologicalFatherId;
      }


      const updatedPerson = await person.save();

      // Populate relevant fields for the response
      await Person.populate(updatedPerson, [
        { path: 'biologicalMother', select: 'firstName lastName nickName profilePhotoUrl uniqueId' },
        { path: 'biologicalFather', select: 'firstName lastName nickName profilePhotoUrl uniqueId' },
        { path: 'legalParents.parentId', select: 'firstName lastName nickName profilePhotoUrl uniqueId', model: 'Person' },
      ]);

      logger.info('Person updated successfully.', { userId, treeId, personId, correlationId: req.correlationId });
      res.json(updatedPerson);

    } catch (error) {
      const err = error as Error;
      logger.error('Error updating person:', { userId, treeId, personId, error: err.message, stack: err.stack, correlationId: req.correlationId });
      res.status(500).json({ error: 'Failed to update person.' });
    }
  }
);

// TODO: Implement other person-specific routes here if needed, e.g.:
// GET /persons (list all persons in the tree - might be large, consider pagination)

/**
 * @swagger
 * /api/family-trees/{treeId}/persons/{personId}:
 *   delete:
 *     summary: Delete a specific person by ID within a family tree.
 *     tags: [Persons]
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
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the person to delete.
 *     responses:
 *       204:
 *         description: Person deleted successfully.
 *       400:
 *         description: Invalid ID format for treeId or personId.
 *       403:
 *         description: Access denied (user cannot edit this family tree).
 *       404:
 *         description: Family tree or person not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/persons/:personId',
  [
    param('personId').isMongoId().withMessage('Invalid Person ID format.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, personId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      logger.warn('Attempt to delete person without authenticated user.', { treeId, personId, correlationId: req.correlationId });
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId) as IFamilyTree | null;
      if (!familyTree) {
        logger.warn('FamilyTree not found for person deletion.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Family tree not found.' });
      }

      if (!familyTree.canUserEdit(userId)) { // Or a more specific canUserDelete if available
        logger.warn('User lacks permission to delete person from family tree.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(403).json({ error: 'Access denied: You do not have permission to delete persons from this tree.' });
      }

      const personToDelete = await Person.findOne({ _id: personId, familyTreeId: treeId });
      if (!personToDelete) {
        logger.warn('Person not found for deletion in specified family tree.', { userId, treeId, personId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Person not found in this family tree.' });
      }

      // --- Start Transaction or use careful sequencing ---
      // For simplicity in this example, direct operations are used.
      // In a production system, a transaction would be highly recommended here.

      // 1. Update other persons who have a direct relationship with the deleted person
      // Unset biological parent fields
      await Person.updateMany(
        { familyTreeId: treeId, biologicalMother: personId },
        { $unset: { biologicalMother: 1 } }
      );
      await Person.updateMany(
        { familyTreeId: treeId, biologicalFather: personId },
        { $unset: { biologicalFather: 1 } }
      );

      // Remove from legalParents arrays
      await Person.updateMany(
        { familyTreeId: treeId, 'legalParents.parentId': personId },
        { $pull: { legalParents: { parentId: personId } } as any } // Type assertion for $pull
      );

      // Remove from spouses arrays on other persons
      // This uses the denormalized 'spouses' array on the Person model
      await Person.updateMany(
        { familyTreeId: treeId, 'spouses.spouseId': personId },
        { $pull: { spouses: { spouseId: personId } } as any }
      );

      // Remove from siblings arrays on other persons
      // This uses the denormalized 'siblings' array on the Person model
      await Person.updateMany(
        { familyTreeId: treeId, 'siblings.siblingId': personId },
        { $pull: { siblings: { siblingId: personId } } as any }
      );

      // 2. Delete all Relationship documents involving this person
      // This is crucial as Relationship is the source of truth for connections.
      // The denormalized fields above are just for quick access.
      // Note: Relationship model needs to be imported for this.
      // For now, I'll assume it's available or this part would be in a service.
      // import { Relationship } from '../models/Relationship.js'; // Make sure this is imported
      // await Relationship.deleteMany({ familyTreeId: treeId, $or: [{ person1Id: personId }, { person2Id: personId }] });
      // ^^^ This line would require Relationship model. Since it's not imported in the current file context,
      await Relationship.deleteMany({
        familyTreeId: treeId,
        $or: [
          { person1Id: personToDelete._id },
          { person2Id: personToDelete._id }
        ]
      });
      logger.info(`Deleted relationships involving person ${personId} from tree ${treeId}`, {personId, treeId, correlationId: req.correlationId});


      // 3. Delete the person
      await Person.findByIdAndDelete(personId);

      // 4. Update FamilyTree statistics
      if (familyTree.statistics.totalPersons && familyTree.statistics.totalPersons > 0) {
        familyTree.statistics.totalPersons -= 1;
      } else {
        familyTree.statistics.totalPersons = 0;
      }
      await familyTree.save();

      logger.info('Person deleted successfully.', { userId, treeId, personId, correlationId: req.correlationId });
      res.status(204).send();

    } catch (error) {
      const err = error as Error;
      logger.error('Error deleting person:', { userId, treeId, personId, error: err.message, stack: err.stack, correlationId: req.correlationId });
      res.status(500).json({ error: 'Failed to delete person.' });
    }
  }
);

export default router;
