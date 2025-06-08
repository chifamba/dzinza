import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Person } from '../models/Person.js';
import { FamilyTree } from '../models/FamilyTree.js';
import { Relationship } from '../models/Relationship.js';
import { logger } from '../../../../src/shared/utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/persons:
 *   get:
 *     summary: Get persons from family trees the user has access to
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: familyTreeId
 *         schema:
 *           type: string
 *         description: Filter by family tree ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of persons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 persons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Person'
 */
router.get('/', [
  query('familyTreeId').optional().isMongoId().withMessage('Invalid family tree ID'),
  query('search').optional().isString().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.query.familyTreeId as string;
    const search = req.query.search as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Build query
    const query: any = { userId };

    if (familyTreeId) {
      // Verify user has access to this family tree
      const familyTree = await FamilyTree.findById(familyTreeId);
      if (!familyTree || !familyTree.canUserView(userId)) {
        return res.status(403).json({ error: 'Access denied to family tree' });
      }
      query.familyTreeId = familyTreeId;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { middleName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [persons, total] = await Promise.all([
      Person.find(query)
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(limit)
        .populate('familyTreeId', 'name'),
      Person.countDocuments(query)
    ]);

    res.json({
      persons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

    logger.info('Persons retrieved', {
      userId,
      familyTreeId,
      count: persons.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving persons:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve persons' });
  }
});

/**
 * @swagger
 * /api/persons:
 *   post:
 *     summary: Create a new person
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - familyTreeId
 *             properties:
 *               firstName:
 *                 type: string
 *                 maxLength: 100
 *               middleName:
 *                 type: string
 *                 maxLength: 100
 *               lastName:
 *                 type: string
 *                 maxLength: 100
 *               familyTreeId:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, unknown]
 *               birthDate:
 *                 type: object
 *               isLiving:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Person created successfully
 */
router.post('/', [
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required (1-100 characters)'),
  body('middleName').optional().trim().isLength({ max: 100 }).withMessage('Middle name must be less than 100 characters'),
  body('lastName').optional().trim().isLength({ max: 100 }).withMessage('Last name must be less than 100 characters'),
  body('familyTreeId').isMongoId().withMessage('Valid family tree ID is required'),
  body('gender').optional().isIn(['male', 'female', 'other', 'unknown']),
  body('isLiving').optional().isBoolean(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { familyTreeId, ...personData } = req.body;

    // Verify user has edit access to the family tree
    const familyTree = await FamilyTree.findById(familyTreeId);
    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied to family tree' });
    }

    const person = new Person({
      ...personData,
      familyTreeId,
      userId,
      privacy: familyTree.settings.defaultPersonPrivacy,
    });

    await person.save();

    // Update family tree statistics
    familyTree.statistics.totalPersons += 1;
    await familyTree.save();

    res.status(201).json(person);

    logger.info('Person created', {
      userId,
      personId: person._id,
      familyTreeId,
      name: `${person.firstName} ${person.lastName || ''}`.trim(),
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error creating person:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create person' });
  }
});

/**
 * @swagger
 * /api/persons/{id}:
 *   get:
 *     summary: Get a specific person
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Person ID
 *     responses:
 *       200:
 *         description: Person details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid person ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;

    const person = await Person.findById(personId)
      .populate('familyTreeId', 'name ownerId collaborators privacy');

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check access permissions through family tree
    const familyTree = person.familyTreeId as any;
    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter sensitive information for living persons based on privacy settings
    let personData = person.toObject();
    if (person.isLiving && person.privacy === 'private' && person.userId !== userId) {
      // Hide sensitive information for living persons marked as private
      personData = {
        ...personData,
        birthDate: undefined,
        birthPlace: undefined,
        occupation: undefined,
        biography: undefined,
        facts: [],
        sources: [],
      };
    }

    res.json(personData);

    logger.info('Person retrieved', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving person:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve person' });
  }
});

/**
 * @swagger
 * /api/persons/{id}:
 *   put:
 *     summary: Update a person
 *     tags: [Persons]
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
 *             $ref: '#/components/schemas/Person'
 *     responses:
 *       200:
 *         description: Person updated successfully
 */
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid person ID'),
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }),
  body('middleName').optional().trim().isLength({ max: 100 }),
  body('lastName').optional().trim().isLength({ max: 100 }),
  body('gender').optional().isIn(['male', 'female', 'other', 'unknown']),
  body('isLiving').optional().isBoolean(),
  body('privacy').optional().isIn(['public', 'family', 'private']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;

    const person = await Person.findById(personId)
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check edit permissions
    const familyTree = person.familyTreeId as any;
    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter allowed updates
    const allowedUpdates = [
      'firstName', 'middleName', 'lastName', 'maidenName', 'gender',
      'birthDate', 'deathDate', 'birthPlace', 'deathPlace',
      'profilePhoto', 'photos', 'occupation', 'biography',
      'isLiving', 'privacy', 'sources', 'facts'
    ];

    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(person, updates);
    await person.save();

    res.json(person);

    logger.info('Person updated', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      updates: Object.keys(updates),
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error updating person:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update person' });
  }
});

/**
 * @swagger
 * /api/persons/{id}:
 *   delete:
 *     summary: Delete a person
 *     tags: [Persons]
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
 *         description: Person deleted successfully
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid person ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;

    const person = await Person.findById(personId)
      .populate('familyTreeId', 'name ownerId collaborators');

    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    // Check edit permissions
    const familyTree = person.familyTreeId as any;
    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all relationships involving this person
    await Relationship.deleteMany({
      $or: [
        { person1Id: personId },
        { person2Id: personId }
      ]
    });

    // Delete the person
    await Person.findByIdAndDelete(personId);

    // Update family tree statistics
    familyTree.statistics.totalPersons = Math.max(0, familyTree.statistics.totalPersons - 1);
    await familyTree.save();

    res.status(204).send();

    logger.info('Person deleted', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error deleting person:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete person' });
  }
});

/**
 * @swagger
 * /api/persons/{id}/relationships:
 *   get:
 *     summary: Get all relationships for a person
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Person ID
 *     responses:
 *       200:
 *         description: List of relationships
 */
router.get('/:id/relationships', [
  param('id').isMongoId().withMessage('Invalid person ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;

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

    const relationships = await Relationship.findForPerson(person._id, familyTree._id)
      .populate('person1Id person2Id', 'firstName lastName profilePhoto isLiving');

    res.json(relationships);

    logger.info('Person relationships retrieved', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      relationshipCount: relationships.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving person relationships:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve relationships' });
  }
});

/**
 * @swagger
 * /api/persons/{id}/descendants:
 *   get:
 *     summary: Get all descendants of a person
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: generations
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of generations to retrieve
 *     responses:
 *       200:
 *         description: Tree of descendants
 */
router.get('/:id/descendants', [
  param('id').isMongoId().withMessage('Invalid person ID'),
  query('generations').optional().isInt({ min: 1, max: 10 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;
    const generations = parseInt(req.query.generations as string) || 5;

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

    // Recursive function to get descendants
    const getDescendants = async (parentId: string, level: number): Promise<any[]> => {
      if (level >= generations) return [];

      const children = await Relationship.findChildren(parentId, familyTree._id)
        .populate('person2Id', 'firstName lastName profilePhoto isLiving gender birthDate');

      const descendants = [];
      for (const child of children) {
        const childData = child.person2Id;
        const grandchildren = await getDescendants(childData._id, level + 1);
        
        descendants.push({
          person: childData,
          relationship: child,
          children: grandchildren,
          level: level + 1,
        });
      }

      return descendants;
    };

    const descendants = await getDescendants(personId, 0);

    res.json({
      rootPerson: person,
      descendants,
      generations: generations,
    });

    logger.info('Person descendants retrieved', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      generations,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving person descendants:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve descendants' });
  }
});

/**
 * @swagger
 * /api/persons/{id}/ancestors:
 *   get:
 *     summary: Get all ancestors of a person
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: generations
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       200:
 *         description: Tree of ancestors
 */
router.get('/:id/ancestors', [
  param('id').isMongoId().withMessage('Invalid person ID'),
  query('generations').optional().isInt({ min: 1, max: 10 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const personId = req.params.id;
    const generations = parseInt(req.query.generations as string) || 5;

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

    // Recursive function to get ancestors
    const getAncestors = async (childId: string, level: number): Promise<any[]> => {
      if (level >= generations) return [];

      const parents = await Relationship.findParents(childId, familyTree._id)
        .populate('person1Id', 'firstName lastName profilePhoto isLiving gender birthDate');

      const ancestors = [];
      for (const parent of parents) {
        const parentData = parent.person1Id;
        const grandparents = await getAncestors(parentData._id, level + 1);
        
        ancestors.push({
          person: parentData,
          relationship: parent,
          parents: grandparents,
          level: level + 1,
        });
      }

      return ancestors;
    };

    const ancestors = await getAncestors(personId, 0);

    res.json({
      rootPerson: person,
      ancestors,
      generations: generations,
    });

    logger.info('Person ancestors retrieved', {
      userId,
      personId,
      familyTreeId: familyTree._id,
      generations,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving person ancestors:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve ancestors' });
  }
});

export default router;
