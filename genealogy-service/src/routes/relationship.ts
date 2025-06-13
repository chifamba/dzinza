import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Relationship } from '../models/Relationship.js';
import { Person } from '../models/Person.js';
import { FamilyTree } from '../models/FamilyTree.js';
import { logger } from '../../../../src/shared/utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/relationships:
 *   get:
 *     summary: Get relationships with filtering options
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: familyTreeId
 *         schema:
 *           type: string
 *         description: Filter by family tree ID
 *       - in: query
 *         name: personId
 *         schema:
 *           type: string
 *         description: Filter by person ID (either person1Id or person2Id)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [spouse, parent-child, sibling, half-sibling, step-sibling, adoptive-parent-child, godparent-godchild, other]
 *         description: Filter by relationship type
 *     responses:
 *       200:
 *         description: List of relationships
 */
router.get('/', [
  query('familyTreeId').optional().isMongoId().withMessage('Invalid family tree ID'),
  query('personId').optional().isMongoId().withMessage('Invalid person ID'),
  query('type').optional().isIn(['spouse', 'parent-child', 'sibling', 'half-sibling', 'step-sibling', 'adoptive-parent-child', 'godparent-godchild', 'other']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { familyTreeId, personId, type } = req.query;

    // Build query
    const query: any = {};

    if (familyTreeId) {
      // Verify user has access to this family tree
      const familyTree = await FamilyTree.findById(familyTreeId);
      if (!familyTree || !familyTree.canUserView(userId)) {
        return res.status(403).json({ error: 'Access denied to family tree' });
      }
      query.familyTreeId = familyTreeId;
    } else {
      // If no family tree specified, get all accessible family trees
      const accessibleTrees = await FamilyTree.find({
        $or: [
          { ownerId: userId },
          { 'collaborators.userId': userId, 'collaborators.acceptedAt': { $exists: true } }
        ]
      }).select('_id');
      
      query.familyTreeId = { $in: accessibleTrees.map(tree => tree._id) };
    }

    if (personId) {
      query.$or = [
        { person1Id: personId },
        { person2Id: personId }
      ];
    }

    if (type) {
      query.type = type;
    }

    const relationships = await Relationship.find(query)
      .populate('person1Id person2Id', 'firstName lastName profilePhoto isLiving gender')
      .populate('familyTreeId', 'name')
      .sort({ createdAt: -1 });

    res.json(relationships);

    logger.info('Relationships retrieved', {
      userId,
      familyTreeId,
      personId,
      type,
      count: relationships.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving relationships:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve relationships' });
  }
});

/**
 * @swagger
 * /api/relationships:
 *   post:
 *     summary: Create a new relationship
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - person1Id
 *               - person2Id
 *               - type
 *               - familyTreeId
 *             properties:
 *               person1Id:
 *                 type: string
 *               person2Id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [spouse, parent-child, sibling, half-sibling, step-sibling, adoptive-parent-child, godparent-godchild, other]
 *               familyTreeId:
 *                 type: string
 *               startDate:
 *                 type: object
 *               status:
 *                 type: string
 *                 enum: [active, ended, unknown]
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Relationship created successfully
 */
router.post('/', [
  body('person1Id').isMongoId().withMessage('Valid person1Id is required'),
  body('person2Id').isMongoId().withMessage('Valid person2Id is required'),
  body('type').isIn(['spouse', 'parent-child', 'sibling', 'half-sibling', 'step-sibling', 'adoptive-parent-child', 'godparent-godchild', 'other']).withMessage('Invalid relationship type'),
  body('familyTreeId').isMongoId().withMessage('Valid family tree ID is required'),
  body('status').optional().isIn(['active', 'ended', 'unknown']),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { person1Id, person2Id, type, familyTreeId, startDate, endDate, status, notes, sources } = req.body;

    // Verify user has edit access to the family tree
    const familyTree = await FamilyTree.findById(familyTreeId);
    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied to family tree' });
    }

    // Verify both persons exist and belong to the family tree
    const [person1, person2] = await Promise.all([
      Person.findOne({ _id: person1Id, familyTreeId }),
      Person.findOne({ _id: person2Id, familyTreeId })
    ]);

    if (!person1) {
      return res.status(404).json({ error: 'Person1 not found in this family tree' });
    }

    if (!person2) {
      return res.status(404).json({ error: 'Person2 not found in this family tree' });
    }

    // Helper function to check for cyclical relationships
    // Note: This is a simplified check. For very large trees, it might need optimization (e.g., limiting depth).
    const isAncestor = async (potentialAncestorId: string, personId: string, treeId: string, visited: Set<string> = new Set()): Promise<boolean> => {
      if (potentialAncestorId === personId) return true;
      if (visited.has(personId)) return false; // Path already explored
      visited.add(personId);

      // Find direct parents of 'personId'
      // Relationship.findParents returns RelationshipDoc[], where person1Id is the parent.
      const parentRelationships = await Relationship.find({ person2Id: personId, type: { $in: ['parent-child', 'adoptive-parent-child', 'step-parent-child', 'foster-parent-child'] }, familyTreeId: treeId });

      if (!parentRelationships || parentRelationships.length === 0) return false;

      for (const parentRel of parentRelationships) {
        if (await isAncestor(potentialAncestorId, parentRel.person1Id.toString(), treeId, visited)) {
          return true;
        }
      }
      return false;
    };

    // Cyclical relationship check for parent-child type relationships
    const parentChildTypes = ['parent-child', 'adoptive-parent-child', 'step-parent-child', 'foster-parent-child'];
    if (parentChildTypes.includes(type)) {
      const parentCandidateId = person1Id; // person1Id is defined as the parent in these relationships
      const childCandidateId = person2Id;

      // Check 1: Child cannot be an ancestor of the Parent
      if (await isAncestor(childCandidateId, parentCandidateId, familyTreeId)) {
        logger.warn('Cyclical relationship detected: Child is an ancestor of the Parent.', { userId, familyTreeId, parentCandidateId, childCandidateId, type, correlationId: req.correlationId });
        return res.status(400).json({ error: 'Cyclical relationship detected: The child cannot be an ancestor of the parent.' });
      }
      // Check 2: Parent cannot be a descendant of the Child (i.e. child is not an ancestor of parent is already done)
      // This also implies parent cannot be child of itself (which model validation should also catch)
      // No, this check is not needed here as the first one covers it. Redundant.
    }

    // Check for existing relationship of the same type (or any for certain types)
    // For parent-child, a person can't have the same individual as two different types of parent from person1's perspective.
    // And a person can't be a child of the same parent twice.
    // This logic might need refinement based on how specific types should interact.
    // The original check was for *any* existing relationship.
    // Let's refine to check for a relationship of the *same type* or conflicting parent-child.

    let conflictingRelationshipQuery: any = {
        $or: [
            { person1Id, person2Id, type, familyTreeId },
            { person1Id: person2Id, person2Id: person1Id, type, familyTreeId } // For symmetric types
        ]
    };

    if (parentChildTypes.includes(type)) {
        // If adding parent-child, ensure person2 (child) doesn't already have person1 (parent) as a parent of this type
        // or any other parent-child type (a person usually has max 2 biological parents shown as 'parent-child')
        // This rule might be too strict if we allow multiple step-parents for example.
        // For now, let's assume only one 'parent-child' like relationship from P1 to P2.
        conflictingRelationshipQuery = { person1Id, person2Id, type, familyTreeId };
    }


    const existingRelationship = await Relationship.findOne(conflictingRelationshipQuery);

    if (existingRelationship) {
       logger.warn('Conflicting relationship detected', { userId, familyTreeId, person1Id, person2Id, type, correlationId: req.correlationId });
      return res.status(400).json({ error: `A relationship of type '${type}' already exists or conflicts with an existing one.` });
    }


    // Create the relationship
    const relationship = new Relationship({
      person1Id,
      person2Id,
      type,
      familyTreeId,
      startDate,
      endDate,
      status: status || 'active',
      notes,
      sources: sources || []
    });

    await relationship.save();

    // For symmetric relationships, create the inverse relationship automatically
    if (relationship.isSymmetric()) {
      const inverseRelationship = new Relationship({
        person1Id: person2Id,
        person2Id: person1Id,
        type,
        familyTreeId,
        startDate,
        endDate,
        status: status || 'active',
        notes,
        sources: sources || []
      });
      await inverseRelationship.save();
    }

    // Populate the created relationship
    await relationship.populate('person1Id person2Id', 'firstName lastName profilePhoto');

    res.status(201).json(relationship);

    logger.info('Relationship created', {
      userId,
      relationshipId: relationship._id,
      person1Id,
      person2Id,
      type,
      familyTreeId,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error creating relationship:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create relationship' });
  }
});

/**
 * @swagger
 * /api/relationships/{id}:
 *   get:
 *     summary: Get a specific relationship
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relationship details
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid relationship ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const relationshipId = req.params.id;

    const relationship = await Relationship.findById(relationshipId)
      .populate('person1Id person2Id', 'firstName lastName profilePhoto isLiving gender birthDate')
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Check access permissions through family tree
    const familyTree = relationship.familyTreeId as any;
    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(relationship);

    logger.info('Relationship retrieved', {
      userId,
      relationshipId,
      familyTreeId: familyTree._id,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving relationship:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve relationship' });
  }
});

/**
 * @swagger
 * /api/relationships/{id}:
 *   put:
 *     summary: Update a relationship
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Relationship'
 *     responses:
 *       200:
 *         description: Relationship updated successfully
 */
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid relationship ID'),
  body('type').optional().isIn(['spouse', 'parent-child', 'sibling', 'half-sibling', 'step-sibling', 'adoptive-parent-child', 'godparent-godchild', 'other']),
  body('status').optional().isIn(['active', 'ended', 'unknown']),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const relationshipId = req.params.id;

    const relationship = await Relationship.findById(relationshipId)
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Check edit permissions
    const familyTree = relationship.familyTreeId as any;
    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter allowed updates
    const allowedUpdates = ['type', 'startDate', 'endDate', 'status', 'notes', 'sources'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(relationship, updates);
    await relationship.save();

    await relationship.populate('person1Id person2Id', 'firstName lastName profilePhoto');

    res.json(relationship);

    logger.info('Relationship updated', {
      userId,
      relationshipId,
      familyTreeId: familyTree._id,
      updates: Object.keys(updates),
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error updating relationship:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update relationship' });
  }
});

/**
 * @swagger
 * /api/relationships/{id}:
 *   delete:
 *     summary: Delete a relationship
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Relationship deleted successfully
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid relationship ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const relationshipId = req.params.id;

    const relationship = await Relationship.findById(relationshipId)
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Check edit permissions
    const familyTree = relationship.familyTreeId as any;
    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // For symmetric relationships, also delete the inverse relationship
    if (relationship.isSymmetric()) {
      await Relationship.findOneAndDelete({
        person1Id: relationship.person2Id,
        person2Id: relationship.person1Id,
        type: relationship.type,
        familyTreeId: relationship.familyTreeId
      });
    }

    await Relationship.findByIdAndDelete(relationshipId);

    res.status(204).send();

    logger.info('Relationship deleted', {
      userId,
      relationshipId,
      familyTreeId: familyTree._id,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error deleting relationship:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete relationship' });
  }
});

/**
 * @swagger
 * /api/relationships/family-tree/{familyTreeId}/chart:
 *   get:
 *     summary: Get family tree chart data
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: familyTreeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: rootPersonId
 *         schema:
 *           type: string
 *         description: Root person for the chart (optional)
 *       - in: query
 *         name: generations
 *         schema:
 *           type: integer
 *           default: 4
 *         description: Number of generations to include
 *     responses:
 *       200:
 *         description: Family tree chart data
 */
router.get('/family-tree/:familyTreeId/chart', [
  param('familyTreeId').isMongoId().withMessage('Invalid family tree ID'),
  query('rootPersonId').optional().isMongoId(),
  query('generations').optional().isInt({ min: 1, max: 8 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.params.familyTreeId;
    const rootPersonId = req.query.rootPersonId as string;
    const generations = parseInt(req.query.generations as string) || 4;

    // Verify user has access to this family tree
    const familyTree = await FamilyTree.findById(familyTreeId);
    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine root person
    let rootPerson;
    if (rootPersonId) {
      rootPerson = await Person.findOne({ _id: rootPersonId, familyTreeId });
    } else if (familyTree.rootPersonId) {
      rootPerson = await Person.findById(familyTree.rootPersonId);
    } else {
      // Find the oldest person as root
      rootPerson = await Person.findOne({ 
        familyTreeId,
        'birthDate.date': { $exists: true }
      }).sort({ 'birthDate.date': 1 });
    }

    if (!rootPerson) {
      return res.status(404).json({ error: 'No suitable root person found' });
    }

    // Get all persons and relationships in the family tree
    const [allPersons, allRelationships] = await Promise.all([
      Person.find({ familyTreeId }).lean(),
      Relationship.find({ familyTreeId }).lean()
    ]);

    // Build the family tree chart data
    const buildChart = (personId: string, level: number, visited = new Set()): any => {
      if (level >= generations || visited.has(personId)) {
        return null;
      }

      visited.add(personId);
      const person = allPersons.find(p => p._id.toString() === personId);
      if (!person) return null;

      // Find relationships for this person
      const relationships = allRelationships.filter(r => 
        r.person1Id.toString() === personId || r.person2Id.toString() === personId
      );

      // Get spouses
      const spouses = relationships
        .filter(r => r.type === 'spouse')
        .map(r => {
          const spouseId = r.person1Id.toString() === personId ? r.person2Id.toString() : r.person1Id.toString();
          const spouse = allPersons.find(p => p._id.toString() === spouseId);
          return spouse ? {
            ...spouse,
            relationship: r
          } : null;
        })
        .filter(Boolean);

      // Get children
      const children = relationships
        .filter(r => r.type === 'parent-child' && r.person1Id.toString() === personId)
        .map(r => {
          const childId = r.person2Id.toString();
          return buildChart(childId, level + 1, new Set(visited));
        })
        .filter(Boolean);

      // Get parents (only for level 0 to avoid infinite recursion)
      const parents = level === 0 ? relationships
        .filter(r => r.type === 'parent-child' && r.person2Id.toString() === personId)
        .map(r => {
          const parentId = r.person1Id.toString();
          const parent = allPersons.find(p => p._id.toString() === parentId);
          return parent ? {
            ...parent,
            relationship: r
          } : null;
        })
        .filter(Boolean) : [];

      return {
        person,
        spouses,
        children,
        parents,
        level
      };
    };

    const chartData = buildChart(rootPerson._id.toString(), 0);

    res.json({
      familyTree,
      rootPerson,
      chartData,
      metadata: {
        totalPersons: allPersons.length,
        totalRelationships: allRelationships.length,
        generations,
        generatedAt: new Date().toISOString()
      }
    });

    logger.info('Family tree chart generated', {
      userId,
      familyTreeId,
      rootPersonId: rootPerson._id,
      generations,
      totalPersons: allPersons.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error generating family tree chart:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to generate family tree chart' });
  }
});

/**
 * @swagger
 * /api/relationships/suggestions/{personId}:
 *   get:
 *     summary: Get relationship suggestions for a person
 *     tags: [Relationships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: personId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Relationship suggestions
 */
router.get('/suggestions/:personId', [
  param('personId').isMongoId().withMessage('Invalid person ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.personId;

    const person = await Person.findById(personId)
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check access permissions
    const familyTree = person.familyTreeId as any;
    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get existing relationships
    const existingRelationships = await Relationship.findForPerson(person._id, familyTree._id);
    const connectedPersonIds = new Set(
      existingRelationships.flatMap(r => [
        r.person1Id.toString(),
        r.person2Id.toString()
      ])
    );

    // Remove the person themselves
    connectedPersonIds.delete(personId);

    // Find potential relatives based on various criteria
    const suggestions = [];

    // Find people with similar names (potential siblings/relatives)
    if (person.lastName) {
      const sameSurname = await Person.find({
        familyTreeId: familyTree._id,
        _id: { $nin: Array.from(connectedPersonIds).concat([personId]) },
        lastName: { $regex: new RegExp(person.lastName, 'i') },
      }).limit(10);

      suggestions.push(...sameSurname.map(p => ({
        person: p,
        suggestionType: 'same_surname',
        confidence: 0.7,
        reason: `Shares surname "${person.lastName}"`
      })));
    }

    // Find people in similar time periods (potential contemporaries)
    if (person.birthDate?.date) {
      const birthYear = person.birthDate.date.getFullYear();
      const contemporaries = await Person.find({
        familyTreeId: familyTree._id,
        _id: { $nin: Array.from(connectedPersonIds).concat([personId]) },
        'birthDate.date': {
          $gte: new Date(birthYear - 20, 0, 1),
          $lte: new Date(birthYear + 20, 11, 31)
        }
      }).limit(10);

      suggestions.push(...contemporaries.map(p => ({
        person: p,
        suggestionType: 'contemporary',
        confidence: 0.5,
        reason: `Born around the same time (${p.birthDate?.date?.getFullYear()})`
      })));
    }

    // Find people from similar locations
    if (person.birthPlace?.city && person.birthPlace?.state) {
      const sameLocation = await Person.find({
        familyTreeId: familyTree._id,
        _id: { $nin: Array.from(connectedPersonIds).concat([personId]) },
        'birthPlace.city': person.birthPlace.city,
        'birthPlace.state': person.birthPlace.state,
      }).limit(10);

      suggestions.push(...sameLocation.map(p => ({
        person: p,
        suggestionType: 'same_location',
        confidence: 0.6,
        reason: `Born in ${person.birthPlace.city}, ${person.birthPlace.state}`
      })));
    }

    // Remove duplicates and sort by confidence
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.person._id.toString() === suggestion.person._id.toString())
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);

    res.json({
      person,
      suggestions: uniqueSuggestions
    });

    logger.info('Relationship suggestions generated', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      suggestionCount: uniqueSuggestions.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error generating relationship suggestions:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to generate relationship suggestions' });
  }
});

export default router;
