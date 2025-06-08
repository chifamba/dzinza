99import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { FamilyTree } from '../models/FamilyTree.js';
import { Person } from '../models/Person.js';
import { Relationship } from '../models/Relationship.js';
import { logger } from '../../../../src/shared/utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/family-trees:
 *   get:
 *     summary: Get all family trees for the authenticated user
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for family tree names
 *     responses:
 *       200:
 *         description: List of family trees
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trees:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FamilyTree'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const query: any = {
      $or: [
        { ownerId: userId },
        { 'collaborators.userId': userId, 'collaborators.acceptedAt': { $exists: true } }
      ]
    };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [trees, total] = await Promise.all([
      FamilyTree.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('rootPersonId', 'firstName lastName profilePhoto'),
      FamilyTree.countDocuments(query)
    ]);

    // Add user role to each tree
    const treesWithRole = trees.map(tree => {
      const treeObj = tree.toObject();
      treeObj._currentUserId = userId;
      return treeObj;
    });

    res.json({
      trees: treesWithRole,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

    logger.info('Family trees retrieved', {
      userId,
      count: trees.length,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving family trees:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve family trees' });
  }
});

/**
 * @swagger
 * /api/family-trees:
 *   post:
 *     summary: Create a new family tree
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               privacy:
 *                 type: string
 *                 enum: [public, family, private]
 *     responses:
 *       201:
 *         description: Family tree created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FamilyTree'
 */
router.post('/', [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('privacy').optional().isIn(['public', 'family', 'private']).withMessage('Invalid privacy setting'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { name, description, privacy = 'family' } = req.body;

    const familyTree = new FamilyTree({
      name,
      description,
      ownerId: userId,
      privacy,
      settings: {
        allowCollaboration: true,
        showLivingPersons: false,
        defaultPersonPrivacy: 'family',
        theme: 'modern',
      },
      statistics: {
        totalPersons: 0,
        totalGenerations: 0,
        completenessScore: 0,
      },
    });

    await familyTree.save();

    res.status(201).json(familyTree);

    logger.info('Family tree created', {
      userId,
      familyTreeId: familyTree._id,
      name,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error creating family tree:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create family tree' });
  }
});

/**
 * @swagger
 * /api/family-trees/{id}:
 *   get:
 *     summary: Get a specific family tree
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family tree ID
 *     responses:
 *       200:
 *         description: Family tree details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FamilyTree'
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid family tree ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.params.id;

    const familyTree = await FamilyTree.findById(familyTreeId)
      .populate('rootPersonId', 'firstName lastName profilePhoto');

    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    // Check access permissions
    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Add user role
    const treeObj = familyTree.toObject();
    treeObj._currentUserId = userId;

    res.json(treeObj);

    logger.info('Family tree retrieved', {
      userId,
      familyTreeId,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving family tree:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve family tree' });
  }
});

/**
 * @swagger
 * /api/family-trees/{id}:
 *   put:
 *     summary: Update a family tree
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family tree ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               privacy:
 *                 type: string
 *                 enum: [public, family, private]
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Family tree updated successfully
 */
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid family tree ID'),
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
  body('privacy').optional().isIn(['public', 'family', 'private']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.params.id;

    const familyTree = await FamilyTree.findById(familyTreeId);

    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserEdit(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const allowedUpdates = ['name', 'description', 'privacy', 'settings'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    Object.assign(familyTree, updates);
    await familyTree.save();

    res.json(familyTree);

    logger.info('Family tree updated', {
      userId,
      familyTreeId,
      updates: Object.keys(updates),
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error updating family tree:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update family tree' });
  }
});

/**
 * @swagger
 * /api/family-trees/{id}:
 *   delete:
 *     summary: Delete a family tree
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family tree ID
 *     responses:
 *       204:
 *         description: Family tree deleted successfully
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid family tree ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.params.id;

    const familyTree = await FamilyTree.findById(familyTreeId);

    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    // Only owner can delete
    if (familyTree.ownerId !== userId) {
      return res.status(403).json({ error: 'Only the owner can delete a family tree' });
    }

    // Delete all related data
    await Promise.all([
      Person.deleteMany({ familyTreeId }),
      Relationship.deleteMany({ familyTreeId }),
      FamilyTree.findByIdAndDelete(familyTreeId)
    ]);

    res.status(204).send();

    logger.info('Family tree deleted', {
      userId,
      familyTreeId,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error deleting family tree:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete family tree' });
  }
});

/**
 * @swagger
 * /api/family-trees/{id}/collaborators:
 *   post:
 *     summary: Add a collaborator to a family tree
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family tree ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, admin]
 *     responses:
 *       200:
 *         description: Collaborator added successfully
 */
router.post('/:id/collaborators', [
  param('id').isMongoId().withMessage('Invalid family tree ID'),
  body('userId').isString().trim().notEmpty().withMessage('User ID is required'),
  body('role').optional().isIn(['viewer', 'editor', 'admin']).withMessage('Invalid role'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUserId = req.user?.id;
    const familyTreeId = req.params.id;
    const { userId, role = 'viewer' } = req.body;

    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot add yourself as a collaborator' });
    }

    const familyTree = await FamilyTree.findById(familyTreeId);

    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserManage(currentUserId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await familyTree.addCollaborator(userId, role);

    res.json({ message: 'Collaborator added successfully' });

    logger.info('Collaborator added to family tree', {
      currentUserId,
      familyTreeId,
      collaboratorUserId: userId,
      role,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error adding collaborator:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to add collaborator' });
  }
});

/**
 * @swagger
 * /api/family-trees/{id}/statistics:
 *   get:
 *     summary: Get family tree statistics
 *     tags: [Family Trees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Family tree ID
 *     responses:
 *       200:
 *         description: Family tree statistics
 */
router.get('/:id/statistics', [
  param('id').isMongoId().withMessage('Invalid family tree ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const familyTreeId = req.params.id;

    const familyTree = await FamilyTree.findById(familyTreeId);

    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserView(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate fresh statistics
    const [
      totalPersons,
      personsWithPhotos,
      personsWithBirthDates,
      relationships,
      oldestPerson,
      newestPerson
    ] = await Promise.all([
      Person.countDocuments({ familyTreeId }),
      Person.countDocuments({ familyTreeId, profilePhoto: { $exists: true, $ne: null } }),
      Person.countDocuments({ familyTreeId, 'birthDate.date': { $exists: true } }),
      Relationship.countDocuments({ familyTreeId }),
      Person.findOne({ familyTreeId, 'birthDate.date': { $exists: true } }).sort({ 'birthDate.date': 1 }),
      Person.findOne({ familyTreeId, 'birthDate.date': { $exists: true } }).sort({ 'birthDate.date': -1 })
    ]);

    const statistics = {
      totalPersons,
      totalRelationships: relationships,
      personsWithPhotos,
      personsWithBirthDates,
      photoCompleteness: totalPersons > 0 ? Math.round((personsWithPhotos / totalPersons) * 100) : 0,
      birthDateCompleteness: totalPersons > 0 ? Math.round((personsWithBirthDates / totalPersons) * 100) : 0,
      oldestBirthYear: oldestPerson?.birthDate?.date?.getFullYear(),
      newestBirthYear: newestPerson?.birthDate?.date?.getFullYear(),
      ...familyTree.statistics
    };

    res.json(statistics);

    logger.info('Family tree statistics retrieved', {
      userId,
      familyTreeId,
      correlationId: req.correlationId
    });
  } catch (error) {
    logger.error('Error retrieving family tree statistics:', error, { userId: req.user?.id });
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

export default router;
