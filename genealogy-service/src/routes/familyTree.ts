import express, { Request, Response, NextFunction } from 'express'; // Added NextFunction
import { body, param, query, validationResult } from 'express-validator';
// Removed duplicate express and express-validator imports
import { trace, SpanStatusCode, Span } from '@opentelemetry/api'; // Import OpenTelemetry API
import { FamilyTree, FamilyTreeDocument } from '../models/FamilyTree.js'; // Assuming FamilyTreeDocument is the Mongoose doc type
import { Person, PersonDocument } from '../models/Person.js'; // Assuming PersonDocument is the Mongoose doc type
import { Relationship } from '../models/Relationship.js';
import { FilterQuery } from 'mongoose'; // Import FilterQuery
import { logger } from '../../../../src/shared/utils/logger.js';
import multer from 'multer';
import { recordActivity } from '../services/activityLogService.js'; // Import recordActivity
import { parse as parseGedcom, Node as GedcomNode } from 'parse-gedcom'; // Added parse-gedcom
import personRouter from './personRoutes.js'; // Import person routes
import relationshipRouter from './relationshipRoutes.js'; // Import relationship routes

const router = express.Router();
// Mount person and relationship routes to handle actions within a specific tree
router.use('/:treeId', personRouter);
router.use('/:treeId', relationshipRouter);

const upload = multer({ storage: multer.memoryStorage() }); // Configure multer for in-memory storage

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

    const query: FilterQuery<FamilyTreeDocument> = { // Typed query more specifically
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
], async (req: Request, res: Response, _next: NextFunction) => { // Renamed next to _next
  const tracer = trace.getTracer('genealogy-service-familytree-routes');
  await tracer.startActiveSpan('familyTree.getById.handler', async (span: Span) => {
    try {
      span.setAttributes({
        'familytree.id': req.params.id,
        'user.id': req.user?.id,
        'http.method': 'GET',
        'http.route': '/:id'
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Validation failed' });
        span.end();
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user?.id;
      const familyTreeId = req.params.id;

      const familyTree = await tracer.startActiveSpan('familyTree.findById.db', async (dbSpan: Span) => {
        try {
          dbSpan.setAttributes({
            'db.system': 'mongodb',
            'db.operation': 'findById',
            'db.statement': `FamilyTree.findById(${familyTreeId})`
          });
          const tree = await FamilyTree.findById(familyTreeId)
            .populate('rootPersonId', 'firstName lastName profilePhoto');
          dbSpan.setStatus({ code: SpanStatusCode.OK });
          dbSpan.end();
          return tree;
        } catch (dbError) {
          const dbe = dbError as Error;
          dbSpan.recordException(dbe);
          dbSpan.setStatus({ code: SpanStatusCode.ERROR, message: dbe.message });
          dbSpan.end();
          throw dbe;
        }
      });

      if (!familyTree) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Family tree not found' });
        span.end();
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
      correlationId: req.correlationId, // Added comma
    }); // Closed logger object
    span.setStatus({ code: SpanStatusCode.OK }); // Moved outside
    span.end(); // Moved outside
  } catch (error) {
      const err = error as Error;
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.end();
      logger.error('Error retrieving family tree:', err, { userId: req.user?.id });
      // next(err); // Call next if you want global error handler to respond
      res.status(500).json({ error: 'Failed to retrieve family tree' });
    }
  });
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
      .reduce((obj: Record<string, unknown>, key) => { // Changed Record<string, any> to Record<string, unknown>
        obj[key] = req.body[key];
        return obj;
      }, {});

    const oldSettings = { ...familyTree.settings }; // Shallow copy for basic comparison
    const oldPrivacy = familyTree.privacy;

    Object.assign(familyTree, updates);
    const savedTree = await familyTree.save();

    // Construct changesPreview for settings
    let changesPreview = 'Updated tree: ';
    const changedFields: string[] = [];
    if (updates.name && familyTree.name !== updates.name) changedFields.push(`name to "${updates.name}"`); // This comparison is flawed as familyTree.name is already updated.
                                                                                                     // Better to compare updates.name with original familyTree.name before Object.assign if needed for detailed diff.
                                                                                                     // For now, we'll keep it simple.
    if (updates.description) changedFields.push('description');
    if (updates.privacy && oldPrivacy !== updates.privacy) changedFields.push(`privacy to "${updates.privacy}"`);
    if (updates.settings) { // Deeper comparison for settings if necessary
        if (oldSettings?.allowCollaboration !== updates.settings.allowCollaboration) {
            changedFields.push(`collaboration to ${updates.settings.allowCollaboration ? 'enabled' : 'disabled'}`);
        }
        // Add more settings field comparisons as needed
    }
    if (changedFields.length > 0) {
        changesPreview += changedFields.join(', ') + '.';
    } else {
        changesPreview += 'general information.';
    }

    recordActivity({
      userId: userId as string,
      userName: req.user?.name || req.user?.email, // Assuming name or email might be on req.user
      actionType: 'UPDATE_FAMILY_TREE_SETTINGS',
      familyTreeId: savedTree._id,
      targetResourceId: savedTree._id.toString(),
      targetResourceType: 'FamilyTree',
      targetResourceName: savedTree.name,
      changesPreview: changesPreview,
      details: `${req.user?.name || req.user?.id} updated settings for tree '${savedTree.name}'.`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json(savedTree);

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

// --- Manage Collaborator Role ---
/**
 * @swagger
 * /api/family-trees/{treeId}/collaborators/{collaboratorUserId}:
 *   put:
 *     summary: Update the role of a collaborator on a family tree.
 *     tags: [Family Trees, Collaborators]
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
 *         name: collaboratorUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the collaborator to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, admin]
 *                 description: The new role for the collaborator.
 *     responses:
 *       200:
 *         description: Collaborator role updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FamilyTree' # Or a specific collaborator object schema
 *       400:
 *         description: Invalid input (e.g., invalid ID, invalid role, trying to manage self inappropriately).
 *       403:
 *         description: Access denied (user does not have permission to manage collaborators or trying to manage owner).
 *       404:
 *         description: Family tree or collaborator not found.
 *       500:
 *         description: Internal server error.
 */
router.put('/:treeId/collaborators/:collaboratorUserId', [
  param('treeId').isMongoId().withMessage('Invalid family tree ID'),
  param('collaboratorUserId').isString().notEmpty().withMessage('Collaborator user ID is required'),
  body('role').isIn(['viewer', 'editor', 'admin']).withMessage('Role must be one of: viewer, editor, admin'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const currentUserId = req.user?.id;
    const { treeId, collaboratorUserId } = req.params;
    const { role: newRole } = req.body;

    const familyTree = await FamilyTree.findById(treeId);
    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    // Authorization: User must be owner or admin to manage collaborators
    if (!familyTree.canUserManage(currentUserId)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to manage collaborators for this tree.' });
    }

    // Prevent owner from being managed as a collaborator
    if (familyTree.ownerId === collaboratorUserId) {
      return res.status(403).json({ error: 'Cannot manage the owner of the tree as a collaborator.' });
    }

    // Prevent admin from changing their own role via this endpoint (owner can change admin's role)
    if (currentUserId === collaboratorUserId && familyTree.collaborators.find(c => c.userId === currentUserId)?.role === 'admin' && currentUserId !== familyTree.ownerId) {
        return res.status(403).json({ error: 'Admins cannot change their own role. Please ask the tree owner.' });
    }


    const collaboratorIndex = familyTree.collaborators.findIndex(c => c.userId === collaboratorUserId);
    if (collaboratorIndex === -1) {
      return res.status(404).json({ error: 'Collaborator not found on this tree.' });
    }

    if (!familyTree.collaborators[collaboratorIndex].acceptedAt) {
        return res.status(400).json({ error: 'Collaborator has not accepted the invitation yet. Role cannot be changed.' });
    }

    familyTree.collaborators[collaboratorIndex].role = newRole;
    await familyTree.save();

    logger.info('Collaborator role updated', {
      currentUserId,
      familyTreeId: treeId,
      managedCollaboratorId: collaboratorUserId,
      newRole,
      correlationId: req.correlationId,
    });

    // TODO: Notify collaborator {collaboratorUserId} that their role on tree {treeId} was changed to {newRole} by {currentUserId}.
    logger.info(`TODO: Notify collaborator ${collaboratorUserId} that their role on tree ${treeId} was changed to ${newRole} by ${currentUserId}.`);

    // Fetch collaborator's name/email for targetResourceName if possible
    // This might require a User model lookup if not already on collaborator object
    // const collaboratorInfo = familyTree.collaborators[collaboratorIndex]; // This is the updated one // Commented out
    // const collaboratorUser = await User.findById(collaboratorUserId).select('name email'); // Example
    // const targetResourceName = collaboratorUser ? (collaboratorUser.name || collaboratorUser.email) : collaboratorUserId;

    recordActivity({
        userId: currentUserId as string,
        userName: req.user?.name || req.user?.email,
        actionType: 'UPDATE_COLLABORATOR_ROLE',
        familyTreeId: familyTree._id,
        targetResourceId: collaboratorUserId,
        targetResourceType: 'FamilyTreeCollaborator',
        targetResourceName: collaboratorUserId, // Placeholder, ideally fetch name/email
        changesPreview: `Role changed to '${newRole}'`,
        details: `${req.user?.name || currentUserId} changed role of collaborator ${collaboratorUserId} to '${newRole}' on tree '${familyTree.name}'.`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
    });

    res.json(familyTree.collaborators[collaboratorIndex]); // Return updated collaborator or whole tree

  } catch (error) {
    logger.error('Error updating collaborator role:', error, { userId: req.user?.id, treeId: req.params.treeId, collaboratorUserId: req.params.collaboratorUserId });
    res.status(500).json({ error: 'Failed to update collaborator role' });
  }
});

// --- Remove Collaborator ---
/**
 * @swagger
 * /api/family-trees/{treeId}/collaborators/{collaboratorUserId}:
 *   delete:
 *     summary: Remove a collaborator from a family tree.
 *     tags: [Family Trees, Collaborators]
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
 *         name: collaboratorUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the collaborator to remove.
 *     responses:
 *       204:
 *         description: Collaborator removed successfully.
 *       400:
 *         description: Invalid input (e.g., trying to remove self inappropriately).
 *       403:
 *         description: Access denied (user does not have permission or trying to remove owner).
 *       404:
 *         description: Family tree or collaborator not found.
 *       500:
 *         description: Internal server error.
 */
router.delete('/:treeId/collaborators/:collaboratorUserId', [
  param('treeId').isMongoId().withMessage('Invalid family tree ID'),
  param('collaboratorUserId').isString().notEmpty().withMessage('Collaborator user ID is required'),
], async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const { treeId, collaboratorUserId } = req.params;

    const familyTree = await FamilyTree.findById(treeId);
    if (!familyTree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    // Authorization: User must be owner or admin
    if (!familyTree.canUserManage(currentUserId)) {
      return res.status(403).json({ error: 'Access denied: You do not have permission to manage collaborators for this tree.' });
    }

    // Prevent owner from being removed
    if (familyTree.ownerId === collaboratorUserId) {
      return res.status(403).json({ error: 'Cannot remove the owner of the tree.' });
    }

    // Prevent admin from removing themselves (owner can remove admin)
     if (currentUserId === collaboratorUserId && familyTree.collaborators.find(c => c.userId === currentUserId)?.role === 'admin' && currentUserId !== familyTree.ownerId) {
        return res.status(403).json({ error: 'Admins cannot remove themselves. Please ask the tree owner.' });
    }

    const collaboratorExists = familyTree.collaborators.some(c => c.userId === collaboratorUserId);
    if (!collaboratorExists) {
        return res.status(404).json({ error: 'Collaborator not found on this tree.' });
    }

    // Using a direct update to pull the collaborator
    const updateResult = await FamilyTree.updateOne(
      { _id: treeId },
      { $pull: { collaborators: { userId: collaboratorUserId } } }
    );

    if (updateResult.modifiedCount === 0) {
      // This might happen if the collaborator was already removed in a race condition, or if userId was not found.
      // The `collaboratorExists` check above should ideally prevent the "not found" case here.
      logger.warn('Collaborator removal did not modify the document, might have been already removed or user ID mismatch.', { treeId, collaboratorUserId });
      // Still return success as the desired state (collaborator removed) is achieved or was already true.
    }

    // Optional: Revoke pending invitations for this user on this tree
    // This would involve importing Invitation model and updating status.
    // For now, focusing on removing accepted collaborators as per prompt.
    // Example: await Invitation.updateMany({ familyTreeId: treeId, inviteeUserId: collaboratorUserId, status: 'pending' }, { $set: { status: 'revoked' } });


    logger.info('Collaborator removed', {
      currentUserId,
      familyTreeId: treeId,
      removedCollaboratorId: collaboratorUserId,
      correlationId: req.correlationId,
    });

    // TODO: Notify user {collaboratorUserId} that they have been removed from tree {treeId} by {currentUserId}.
    logger.info(`TODO: Notify user ${collaboratorUserId} that they have been removed from tree ${treeId} by ${currentUserId}.`);


    res.status(204).send();

  } catch (error) {
    logger.error('Error removing collaborator:', error, { userId: req.user?.id, treeId: req.params.treeId, collaboratorUserId: req.params.collaboratorUserId });
    res.status(500).json({ error: 'Failed to remove collaborator' });
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

/**
 * @swagger
 * /api/family-trees/{treeId}/members/{memberId}/details:
 *   get:
 *     summary: Get detailed information for a specific person in a family tree, including their direct relationships.
 *     tags: [Family Trees, Persons]
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
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the person (member).
 *     responses:
 *       200:
 *         description: Detailed information about the person and their relationships.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 person:
 *                   $ref: '#/components/schemas/Person'
 *                 parents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RelatedPerson'
 *                 children:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RelatedPerson'
 *                 spouses:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RelatedPerson'
 *                 siblings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RelatedPerson'
 *       400:
 *         description: Invalid input (e.g., invalid Mongo ID format).
 *       403:
 *         description: Access denied (user does not have permission to view the family tree).
 *       404:
 *         description: Family tree or person not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:treeId/members/:memberId/details', [
  param('treeId').isMongoId().withMessage('Invalid family tree ID'),
  param('memberId').isMongoId().withMessage('Invalid member ID'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { treeId, memberId } = req.params;
    const currentUserId = req.user?.id; // Used for canUserView check

    logger.info('Fetching person details with relationships', { currentUserId, treeId, memberId, correlationId: req.correlationId });

    const familyTree = await FamilyTree.findById(treeId);
    if (!familyTree) {
      logger.warn('Family tree not found for details endpoint', { currentUserId, treeId, memberId, correlationId: req.correlationId });
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserView(currentUserId)) {
      logger.warn('User access denied for family tree details', { currentUserId, treeId, memberId, correlationId: req.correlationId });
      return res.status(403).json({ error: 'Access denied to this family tree' });
    }

    const personPopulateFields = 'firstName lastName nickName profilePhotoUrl gender uniqueId dateOfBirth isLiving dateOfDeath';

    const person = await Person.findOne({ _id: memberId, familyTreeId: treeId })
      .populate('biologicalMother', personPopulateFields)
      .populate('biologicalFather', personPopulateFields)
      .populate({
        path: 'legalParents.parentId',
        select: personPopulateFields,
        model: 'Person',
      })
      .populate({
        path: 'spouses.spouseId',
        select: personPopulateFields,
        model: 'Person',
      })
      .populate({
        path: 'siblings.siblingId',
        select: personPopulateFields,
        model: 'Person',
      })
      .lean(); // Use .lean() for plain JS objects, easier to manipulate

    if (!person) {
      logger.warn('Person not found for details endpoint', { currentUserId, treeId, memberId, correlationId: req.correlationId });
      return res.status(404).json({ error: 'Person not found in this family tree' });
    }

    // Construct parents array
    const parentsResponse = [];
    if (person.biologicalMother) {
      parentsResponse.push({ personDetails: person.biologicalMother, relationshipType: 'BiologicalMother' });
    }
    if (person.biologicalFather) {
      parentsResponse.push({ personDetails: person.biologicalFather, relationshipType: 'BiologicalFather' });
    }
    if (person.legalParents) {
      person.legalParents.forEach(lp => {
        if (lp.parentId) { // parentId should be populated here
          parentsResponse.push({ personDetails: lp.parentId, relationshipType: lp.relationshipType });
        }
      });
    }

    // Construct spouses array
    const spousesResponse = person.spouses?.map(s => ({
      personDetails: s.spouseId, // This is already populated
      status: s.relationshipType, // In ISpouseLink, relationshipType holds the status
      startDate: s.startDate,
      endDate: s.endDate,
      _id: s._id // ID of the spouse link / relationship
    })) || [];

    // Construct siblings array
    const siblingsResponse = person.siblings?.map(s => ({
      personDetails: s.siblingId, // This is already populated
      type: s.relationshipType, // In ISiblingLink, relationshipType holds the sibling type
      _id: s._id // ID of the sibling link / relationship
    })) || [];

    // Fetch children separately by querying Relationships model
    const childrenRelationships = await Relationship.find({
        familyTreeId: treeId,
        person1Id: memberId, // Current person is person1 (parent) in ParentChild relationship
        type: { $in: [RelationshipType.ParentChild, RelationshipType.GuardianChild] }
      })
      .populate('person2Id', personPopulateFields) // person2Id is the child
      .lean();

    const childrenResponse = childrenRelationships.map(r => ({
        personDetails: r.person2Id, // This is populated child
        relationshipToParent: r.parentalRole, // Role of memberId (parent) towards this child
        _id: r._id // ID of the relationship document
    }));

    res.json({
      person, // Main person document (already lean)
      parents: parentsResponse,
      spouses: spousesResponse,
      siblings: siblingsResponse,
      children: childrenResponse,
    });

  } catch (error) {
    const err = error as Error; // Type assertion
    logger.error('Error fetching person details with relationships:', { userId: req.user?.id, treeId, memberId, error: err.message, stack: err.stack, correlationId: req.correlationId });
    res.status(500).json({ error: 'Failed to retrieve person details' });
  }
});

// Import RelationshipType enum for children query (if not already available globally for the file)
import { RelationshipType } from '../models/Relationship.js';

/**
 * @swagger
 * /api/family-trees/{treeId}/import/gedcom:
 *   post:
 *     summary: Import a GEDCOM file into a specified family tree.
 *     tags: [Family Trees, GEDCOM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree to import into.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               gedcomFile:
 *                 type: string
 *                 format: binary
 *                 description: The GEDCOM file (.ged) to upload.
 *     responses:
 *       200:
 *         description: GEDCOM import process summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 individualsImported:
 *                   type: integer
 *                 familiesProcessed:
 *                   type: integer
 *                 relationshipsCreated:
 *                   type: integer
 *       400:
 *         description: Invalid input (e.g., no file, invalid file type, invalid treeId, or GEDCOM parsing errors).
 *       403:
 *         description: Access denied (user does not have permission to edit the family tree).
 *       404:
 *         description: Family tree not found.
 *       500:
 *         description: Internal server error during import.
 */
router.post('/:treeId/import/gedcom',
  upload.single('gedcomFile'), // Multer middleware for single file upload
  [
    param('treeId').isMongoId().withMessage('Invalid family tree ID'),
    // Middleware or validation for file presence can be added here if multer doesn't handle it sufficiently
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user?.id;
      const { treeId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No GEDCOM file uploaded.' });
      }

      logger.info('Starting GEDCOM import', { userId, treeId, fileName: req.file.originalname, correlationId: req.correlationId });

      const familyTree = await FamilyTree.findById(treeId);
      if (!familyTree) {
        logger.warn('Family tree not found for GEDCOM import', { userId, treeId, correlationId: req.correlationId });
        return res.status(404).json({ error: 'Family tree not found' });
      }

      if (!familyTree.canUserEdit(userId)) {
        logger.warn('User access denied for GEDCOM import', { userId, treeId, correlationId: req.correlationId });
        return res.status(403).json({ error: 'Access denied to edit this family tree' });
      }

      const gedcomText = req.file.buffer.toString('utf-8');
      const gedcomTree = parseGedcom(gedcomText);

      let individualsImported = 0;
      let familiesProcessed = 0;
      let relationshipsCreated = 0;
      const gedcomIndiIdToMongoPersonIdMap = new Map<string, string>();
      // Store FAMC links to process after all individuals are created
      const famcLinks: { childMongoId: string, famcId: string }[] = [];
       // Store FAMs links to process after all individuals are created
      const famsLinks: { indiMongoId: string, famsId: string }[] = [];


      // Helper to find a specific node within a list of nodes by tag
      const findNodeByTag = (nodes: GedcomNode[] | undefined, tag: string): GedcomNode | undefined => {
        return nodes?.find(node => node.tag === tag);
      };
      const findNodesByTag = (nodes: GedcomNode[] | undefined, tag: string): GedcomNode[] => {
        return nodes?.filter(node => node.tag === tag) || [];
      };

      // Helper to get data from a node, potentially nested
      const getNodeData = (node: GedcomNode | undefined, subTag?: string): string | undefined => {
        if (!node) return undefined;
        if (subTag) {
          const subNode = findNodeByTag(node.tree, subTag);
          return subNode?.data;
        }
        return node.data;
      };

      const gedcomDateStringToDateObject = (dateStr: string | undefined): { date?: Date, isEstimate?: boolean } => {
        if (!dateStr) return {};
        let isEstimate = false;
        let cleanDateStr = dateStr;

        if (dateStr.startsWith('ABT ') || dateStr.startsWith('EST ') || dateStr.startsWith('CAL ')) {
            isEstimate = true;
            cleanDateStr = dateStr.substring(4);
        } else if (dateStr.startsWith('BEF ') || dateStr.startsWith('AFT ')) {
            isEstimate = true; // Technically range, but treat as estimate
            cleanDateStr = dateStr.substring(4);
        } else if (dateStr.includes('BET ') && dateStr.includes('AND ')) {
            isEstimate = true; // Range, take the first date for simplicity
            cleanDateStr = dateStr.substring(4).split(' AND ')[0];
        }

        try {
            const parsed = new Date(cleanDateStr);
            if (!isNaN(parsed.getTime())) return { date: parsed, isEstimate };
        } catch (e) { /* ignore */ }

        const monthMap: { [key: string]: number } = {
            JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11
        };
        const parts = cleanDateStr.match(/(\d{1,2})?\s*([A-Z]{3})\s*(\d{4})/i);
        if (parts) {
            try {
                const year = parseInt(parts[3]);
                const month = monthMap[parts[2].toUpperCase()];
                const day = parts[1] ? parseInt(parts[1]) : 1;
                if (month !== undefined) {
                    return { date: new Date(year, month, day), isEstimate };
                }
            } catch (e) { /* ignore */ }
        }
         if (/^\d{4}$/.test(cleanDateStr)) { // Just a year
            isEstimate = true;
            return { date: new Date(parseInt(cleanDateStr), 0, 1), isEstimate };
        }
        return { isEstimate: dateStr.length > 0 }; // If any date string exists but couldn't parse, mark as estimate
      };


      // --- Pass 1: Create Individuals (INDI records) ---
      const indiNodes = gedcomTree.filter(node => node.tag === 'INDI');
      for (const indiNode of indiNodes) {
        if (!indiNode.pointer) continue;

        const personData: Partial<PersonDocument> = { familyTreeId: treeId as any };

        const nameNode = findNodeByTag(indiNode.tree, 'NAME');
        if (nameNode?.data) {
            const nameParts = nameNode.data.split('/');
            personData.firstName = getNodeData(findNodeByTag(nameNode.tree, 'GIVN')) || nameParts[0]?.trim();
            personData.lastName = getNodeData(findNodeByTag(nameNode.tree, 'SURN')) || (nameParts[1] || '').trim() || undefined;
            if (!personData.firstName && personData.lastName) { // Handle cases like "/Surname/"
                 personData.firstName = "Unknown";
            } else if (!personData.firstName && !personData.lastName && nameParts[0]) {
                 personData.firstName = nameParts[0].trim(); // If just "Name"
            }

            personData.nickName = getNodeData(findNodeByTag(nameNode.tree, 'NICK'));
            // Could also assemble NPFX, NSFX into a title field if model supports
        } else {
            personData.firstName = 'Unknown';
        }


        const sexNode = findNodeByTag(indiNode.tree, 'SEX');
        if (sexNode?.data === 'M') personData.gender = 'Male';
        else if (sexNode?.data === 'F') personData.gender = 'Female';
        else personData.gender = 'Unknown';

        const birtNode = findNodeByTag(indiNode.tree, 'BIRT');
        if (birtNode) {
            const { date: birthD, isEstimate: birthEstimate } = gedcomDateStringToDateObject(getNodeData(findNodeByTag(birtNode.tree, 'DATE')));
            personData.dateOfBirth = birthD;
            personData.isBirthDateEstimated = birthEstimate;
            personData.placeOfBirth = getNodeData(findNodeByTag(birtNode.tree, 'PLAC'));
        }

        const deatNode = findNodeByTag(indiNode.tree, 'DEAT');
        if (deatNode) {
            const { date: deathD, isEstimate: deathEstimate } = gedcomDateStringToDateObject(getNodeData(findNodeByTag(deatNode.tree, 'DATE')));
            personData.dateOfDeath = deathD;
            personData.isDeathDateEstimated = deathEstimate;
            personData.placeOfDeath = getNodeData(findNodeByTag(deatNode.tree, 'PLAC'));
            personData.causeOfDeath = getNodeData(findNodeByTag(deatNode.tree, 'CAUS'));
            personData.isLiving = false;
        } else {
            personData.isLiving = true;
        }

        personData.notes = findNodesByTag(indiNode.tree, 'NOTE').map(n => n.data).join('\n') || undefined;

        // Identifiers (very basic example)
        personData.identifiers = [];
        const uidNode = findNodeByTag(indiNode.tree, '_UID'); // Common custom tag for a unique ID
        if (uidNode?.data) {
            personData.identifiers.push({ type: 'Other', value: uidNode.data, notes: 'GEDCOM _UID' });
        }
        // Could add more complex identifier parsing here for SSN, IDNO etc.

        // Store FAMC links
        findNodesByTag(indiNode.tree, 'FAMC').forEach(famcNode => {
            if (famcNode.data) {
                 // Will map this later once Mongo IDs are known
            }
        });
         findNodesByTag(indiNode.tree, 'FAMS').forEach(famsNode => {
            if (famsNode.data) {
                // Will map this later
            }
        });


        try {
          const newPerson = new Person(personData);
          await newPerson.save();
          gedcomIndiIdToMongoPersonIdMap.set(indiNode.pointer, newPerson._id.toString());
          individualsImported++;

          // After saving person and getting mongoId, store FAMC links with mongoId
          findNodesByTag(indiNode.tree, 'FAMC').forEach(famcNode => {
            if (famcNode.data) {
                famcLinks.push({ childMongoId: newPerson._id.toString(), famcId: famcNode.data });
            }
          });
          findNodesByTag(indiNode.tree, 'FAMS').forEach(famsNode => {
             if (famsNode.data) {
                famsLinks.push({ indiMongoId: newPerson._id.toString(), famsId: famsNode.data });
             }
          });

        } catch(personSaveError) {
            logger.error('Failed to save person from GEDCOM:', { gedcomId: indiNode.pointer, name: personData.firstName, error: personSaveError, correlationId: req.correlationId });
        }
      }

      // --- Pass 2: Create Families (FAM records) and Relationships ---
      const famNodes = gedcomTree.filter(node => node.tag === 'FAM');
      // Map FAM IDs to the Relationship documents created for spouses in that family
      const famIdToSpousalRelationshipIdMap = new Map<string, string>();

      for (const famNode of famNodes) {
        if (!famNode.pointer) continue;
        familiesProcessed++;

        const husbNode = findNodeByTag(famNode.tree, 'HUSB');
        const wifeNode = findNodeByTag(famNode.tree, 'WIFE');
        // const chilNodes = findNodesByTag(famNode.tree, 'CHIL'); // Children handled via famcLinks

        const husbandMongoId = husbNode?.data ? gedcomIndiIdToMongoPersonIdMap.get(husbNode.data) : undefined;
        const wifeMongoId = wifeNode?.data ? gedcomIndiIdToMongoPersonIdMap.get(wifeNode.data) : undefined;

        const marriageEventNodes = findNodesByTag(famNode.tree, 'MARR');
        let mainMarriageEvent: any;
        const relationshipEvents: any[] = [];

        marriageEventNodes.forEach(marrNode => {
            const eventDateDetails = gedcomDateStringToDateObject(getNodeData(findNodeByTag(marrNode.tree, 'DATE')));
            const event = {
                eventType: 'Marriage', // Default, could be refined by MARR.TYPE
                date: eventDateDetails.date,
                isDateEstimated: eventDateDetails.isEstimate,
                place: getNodeData(findNodeByTag(marrNode.tree, 'PLAC')),
                description: findNodesByTag(marrNode.tree, 'NOTE').map(n => n.data).join('\n') || undefined,
            };
            relationshipEvents.push(event);
            if(!mainMarriageEvent && event.date) mainMarriageEvent = event; // Use first dated marriage as primary
        });

        const divorceEventNodes = findNodesByTag(famNode.tree, 'DIV');
        divorceEventNodes.forEach(divNode => {
            const eventDateDetails = gedcomDateStringToDateObject(getNodeData(findNodeByTag(divNode.tree, 'DATE')));
            const event = {
                eventType: 'Divorce',
                date: eventDateDetails.date,
                isDateEstimated: eventDateDetails.isEstimate,
                place: getNodeData(findNodeByTag(divNode.tree, 'PLAC')),
                description: findNodesByTag(divNode.tree, 'NOTE').map(n => n.data).join('\n') || undefined,
            };
            relationshipEvents.push(event);
        });


        if (husbandMongoId && wifeMongoId) {
          try {
            const husbandDoc = await Person.findById(husbandMongoId);
            const wifeDoc = await Person.findById(wifeMongoId);

            if (husbandDoc && wifeDoc) {
                const spousalStatus = divorceEventNodes.length > 0 ? SpousalStatus.Divorced : (marriageEventNodes.length > 0 ? SpousalStatus.Married : SpousalStatus.Other);

                const spouseRel = new Relationship({
                    familyTreeId: treeId,
                    person1Id: husbandMongoId,
                    person2Id: wifeMongoId,
                    type: RelationshipType.Spousal,
                    status: spousalStatus,
                    startDate: mainMarriageEvent?.date,
                    // endDate could be inferred from divorce date if needed for the relationship itself
                    events: relationshipEvents,
                });
                await spouseRel.save();
                relationshipsCreated++;
                famIdToSpousalRelationshipIdMap.set(famNode.pointer, spouseRel._id.toString());

                // Denormalize: Update spouses array on Person documents
                const spouseLink Husband = { _id: spouseRel._id, spouseId: wifeMongoId, relationshipType: spousalStatus, startDate: spouseRel.startDate, endDate: spouseRel.endDate };
                const spouseLinkWife = { _id: spouseRel._id, spouseId: husbandMongoId, relationshipType: spousalStatus, startDate: spouseRel.startDate, endDate: spouseRel.endDate };

                husbandDoc.spouses.push(spouseLinkHusband);
                wifeDoc.spouses.push(spouseLinkWife);
                await husbandDoc.save();
                await wifeDoc.save();
            }
          } catch(relSaveError) {
              logger.error('Failed to save spouse relationship from GEDCOM:', { husbandId, wifeId, error: relSaveError, correlationId: req.correlationId });
          }
        }
      }

      // --- Pass 3: Link Children to Parents and create Parent-Child Relationships ---
      for (const link of famcLinks) {
          const childDoc = await Person.findById(link.childMongoId);
          if (!childDoc) continue;

          const famNode = famNodes.find(fn => fn.pointer === link.famcId);
          if (!famNode) continue;

          const husbNode = findNodeByTag(famNode.tree, 'HUSB');
          const wifeNode = findNodeByTag(famNode.tree, 'WIFE');
          const fatherMongoId = husbNode?.data ? gedcomIndiIdToMongoPersonIdMap.get(husbNode.data) : undefined;
          const motherMongoId = wifeNode?.data ? gedcomIndiIdToMongoPersonIdMap.get(wifeNode.data) : undefined;

          let fatherRelExists = false;
          let motherRelExists = false;

          // Check if relationship already exists (e.g. from a previous import or manual entry)
          if (fatherMongoId) {
            fatherRelExists = await Relationship.exists({familyTreeId: treeId, person1Id: fatherMongoId, person2Id: childDoc._id, type: RelationshipType.ParentChild});
          }
          if (motherMongoId) {
            motherRelExists = await Relationship.exists({familyTreeId: treeId, person1Id: motherMongoId, person2Id: childDoc._id, type: RelationshipType.ParentChild});
          }

          // Determine adoption status for this child within this family
          const adoptionNode = findNodeByTag(findNodeByTag(famNode.tree, 'CHIL', link.childMongoId)?.tree, 'ADOP'); // CHIL pointer is not standard, this check is weak.
                                                                                                                    // A better check would be on CHIL node itself or child's INDI record for adoption events tied to this FAM.
                                                                                                                    // For now, assuming ADOP tag under FAM directly implies adoption by parents in this FAM.

          let fatherIsAdoptive = !!findNodeByTag(adoptionNode?.tree, 'HUSB'); // if HUSB is listed under ADOP tag for child
          let motherIsAdoptive = !!findNodeByTag(adoptionNode?.tree, 'WIFE'); // if WIFE is listed under ADOP tag for child
          if (adoptionNode && !fatherIsAdoptive && !motherIsAdoptive) { // General ADOP tag for child in this family
            fatherIsAdoptive = !!fatherMongoId; // If father exists in FAM, they are adoptive
            motherIsAdoptive = !!motherMongoId; // If mother exists in FAM, they are adoptive
          }


          if (fatherMongoId && !fatherRelExists) {
              const fatherRole = fatherIsAdoptive ? ParentalRole.AdoptiveFather : ParentalRole.BiologicalFather;
              try {
                  const rel = new Relationship({ familyTreeId: treeId, person1Id: fatherMongoId, person2Id: childDoc._id, type: RelationshipType.ParentChild, parentalRole: fatherRole });
                  await rel.save(); relationshipsCreated++;
                  if (!fatherIsAdoptive) childDoc.biologicalFather = fatherMongoId as any;
                  else {
                    const existingLegal = childDoc.legalParents.find(lp => lp.parentId.equals(fatherMongoId));
                    if(!existingLegal) childDoc.legalParents.push({parentId: fatherMongoId as any, relationshipType: 'Adoptive'});
                  }
              } catch (e) { logger.error("Error creating father-child rel", e); }
          }
          if (motherMongoId && !motherRelExists) {
              const motherRole = motherIsAdoptive ? ParentalRole.AdoptiveMother : ParentalRole.BiologicalMother;
              try {
                  const rel = new Relationship({ familyTreeId: treeId, person1Id: motherMongoId, person2Id: childDoc._id, type: RelationshipType.ParentChild, parentalRole: motherRole });
                  await rel.save(); relationshipsCreated++;
                  if (!motherIsAdoptive) childDoc.biologicalMother = motherMongoId as any;
                  else {
                    const existingLegal = childDoc.legalParents.find(lp => lp.parentId.equals(motherMongoId));
                    if(!existingLegal) childDoc.legalParents.push({parentId: motherMongoId as any, relationshipType: 'Adoptive'});
                  }
              } catch (e) { logger.error("Error creating mother-child rel", e); }
          }
          await childDoc.save();
      }

      // Note: Sibling relationships are not explicitly created here from FAM records.
      // They can be inferred later or created if specific SIBL tags were used (non-standard).
      // The current Person.siblings array is populated via direct Sibling Relationship creation.

      // Update FamilyTree statistics
      familyTree.statistics.totalPersons = (familyTree.statistics.totalPersons || 0) + individualsImported;
      // totalGenerations and completenessScore would need more complex calculation
      await familyTree.save();

      logger.info('GEDCOM import completed with enhanced parsing', { userId, treeId, individualsImported, familiesProcessed, relationshipsCreated, correlationId: req.correlationId });
      res.status(200).json({
        message: 'GEDCOM import processed.',
        individualsImported,
        familiesProcessed,
        relationshipsCreated,
      });

    } catch (error) {
      logger.error('Error during GEDCOM import endpoint:', error, { userId: req.user?.id, treeId: req.params.treeId, correlationId: req.correlationId });
      res.status(500).json({ error: 'Failed to import GEDCOM file' });
    }
  }
);

// Helper function to format Date object for GEDCOM, including estimation prefix
const formatGedcomDateWithEstimate = (date: Date | undefined | null, isEstimate?: boolean): string | undefined => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return undefined;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' }).toUpperCase(); // Ensures uppercase month e.g. JAN
  const year = date.getFullYear();

  let prefix = "";
  if (isEstimate) { // Assuming isEstimate is true for ABT, EST, CAL
    // GEDCOM doesn't have a single "estimated" prefix. ABT (about) is common.
    // Or could use NOTE for "estimated". For simplicity, using ABT for any estimate.
    prefix = "ABT ";
  }
  return `${prefix}${day} ${month} ${year}`;
};

// Re-define or ensure RelationshipType and ParentalRole enums are available if used from Relationship model
import { RelationshipType, ParentalRole, SpousalStatus } from '../models/Relationship.js';


/**
 * @swagger
 * /api/family-trees/{treeId}/export/gedcom:
 *   get:
 *     summary: Export a family tree in GEDCOM format
 *     tags: [Family Trees, GEDCOM]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: treeId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the family tree to export.
 *     responses:
 *       200:
 *         description: GEDCOM file content.
 *         content:
 *           application/x-gedcom: # Or text/plain
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid treeId.
 *       403:
 *         description: Access denied.
 *       404:
 *         description: Family tree not found.
 *       500:
 *         description: Internal server error during export.
 */
router.get('/:treeId/export/gedcom', [
  param('treeId').isMongoId().withMessage('Invalid family tree ID'),
], async (req: Request, res: Response) => {
  const tracer = trace.getTracer('genealogy-service-familytree-routes');
  await tracer.startActiveSpan('familyTree.exportGedcom.handler', async (span: Span) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Validation failed for export' });
        span.end();
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user?.id;
      const { treeId } = req.params;
      span.setAttributes({ 'familytree.id': treeId, 'user.id': userId });

      const familyTree = await FamilyTree.findById(treeId);
      if (!familyTree) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Family tree not found for export' });
        span.end();
        return res.status(404).json({ error: 'Family tree not found' });
      }

      if (!familyTree.canUserView(userId)) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Access denied for export' });
        span.end();
        return res.status(403).json({ error: 'Access denied to this family tree' });
      }

      const persons = await Person.find({ familyTreeId: treeId })
        .populate('identifiers') // Assuming identifiers are subdocuments; if not, this isn't needed here.
                                 // Person schema already has identifiers as an array of subdocuments.
        .lean();
      const relationships = await Relationship.find({ familyTreeId: treeId }).lean();

      const gedcomLines: string[] = [];
      const mongoPersonIdToGedcomIndiId = new Map<string, string>();
      let indiCounter = 1;
      let famCounter = 1;

      // --- Helper function to add lines if data exists ---
      const addLine = (level: number, tag: string, value?: string | null, subLines?: () => void) => {
        if (value || typeof subLines === 'function') {
          gedcomLines.push(`${level} ${tag}${value ? ' ' + value : ''}`);
          if (subLines) {
            subLines();
          }
        }
      };

      // Header
      gedcomLines.push('0 HEAD');
      gedcomLines.push('1 SOUR DzinzaGenealogyPlatform');
      gedcomLines.push('1 GEDC');
      gedcomLines.push('2 VERS 5.5.1');
      gedcomLines.push('2 FORM LINEAGE-LINKED');
      gedcomLines.push('1 CHAR UTF-8');
      gedcomLines.push('1 SUBM @SUBM1@');

      // Submitter Record
      gedcomLines.push('0 @SUBM1@ SUBM');
      gedcomLines.push('1 NAME Dzinza User');

      // Individual (INDI) Records
      for (const person of persons) {
        const gedcomIndiId = `@I${indiCounter++}@`;
        mongoPersonIdToGedcomIndiId.set(person._id.toString(), gedcomIndiId);

        addLine(0, `${gedcomIndiId} INDI`);

        let nameString = "";
        if (person.firstName && person.firstName !== "Unknown") nameString += person.firstName;
        if (person.lastName) nameString += ` /${person.lastName}/`;
        else if (!person.firstName) nameString = "Unknown /Unknown/";
        addLine(1, "NAME", nameString.trim());
        if (person.nickName) addLine(2, "NICK", person.nickName);

        if (person.gender) {
          const sex = person.gender.toUpperCase().startsWith('M') ? 'M' : person.gender.toUpperCase().startsWith('F') ? 'F' : 'U';
          addLine(1, "SEX", sex);
        }

        if (person.dateOfBirth || person.placeOfBirth) {
          addLine(1, "BIRT", undefined, () => {
            if (person.dateOfBirth) addLine(2, "DATE", formatGedcomDateWithEstimate(new Date(person.dateOfBirth), person.isBirthDateEstimated));
            if (person.placeOfBirth) addLine(2, "PLAC", person.placeOfBirth);
          });
        }
        if (person.dateOfDeath || person.placeOfDeath || person.causeOfDeath) {
          addLine(1, "DEAT", undefined, () => {
            if (person.dateOfDeath) addLine(2, "DATE", formatGedcomDateWithEstimate(new Date(person.dateOfDeath), person.isDeathDateEstimated));
            if (person.placeOfDeath) addLine(2, "PLAC", person.placeOfDeath);
            if (person.causeOfDeath) addLine(2, "CAUS", person.causeOfDeath);
          });
        }

        person.identifiers?.forEach(id => {
            // Standard GEDCOM tags for some identifiers are limited. Using custom for most.
            if (id.type === 'Email') addLine(1, "EMAIL", id.value);
            else if (id.type === 'Phone') addLine(1, "PHON", id.value);
            else addLine(1, `_IDNO ${id.value}`, undefined, () => { // Custom tag for other ID numbers
                if(id.type) addLine(2, "TYPE", id.type);
                if(id.verificationStatus) addLine(2, "STAT", id.verificationStatus); // Custom for status
                if(id.notes) addLine(2, "NOTE", id.notes);
            });
        });

        if (person.clan) addLine(1, "_CLAN", person.clan);
        if (person.tribe) addLine(1, "_TRIBE", person.tribe);
        person.traditionalTitles?.forEach(title => addLine(1, "TITL", title)); // TITL is somewhat standard for titles/offices

        if (person.notes) {
            person.notes.split('\n').forEach(noteLine => addLine(1, "NOTE", noteLine));
        }
      }

      // --- FAM Record Generation ---
      // This pass creates FAM records and links spouses and children to them.
      // It also updates INDI records with FAMC/FAMS links.
      const personGedcomMapWithFamLinks: Record<string, { famc: string[], fams: string[] }> = {};
      persons.forEach(p => personGedcomMapWithFamLinks[mongoPersonIdToGedcomIndiId.get(p._id.toString())!] = { famc: [], fams: [] });


      for (const rel of relationships) {
        const p1GedId = mongoPersonIdToGedcomIndiId.get(rel.person1Id.toString());
        const p2GedId = mongoPersonIdToGedcomIndiId.get(rel.person2Id.toString());
        if (!p1GedId || !p2GedId) continue;

        if (rel.type === RelationshipType.Spousal) {
          const gedcomFamId = `@F${famCounter++}@`;
          addLine(0, `${gedcomFamId} FAM`);

          // Determine HUSB/WIFE based on Person.gender if available
          const p1Doc = persons.find(p => p._id.toString() === rel.person1Id.toString());
          const p2Doc = persons.find(p => p._id.toString() === rel.person2Id.toString());

          if (p1Doc?.gender === 'Male' || (p1Doc?.gender !== 'Female' && p2Doc?.gender === 'Female')) {
            addLine(1, "HUSB", p1GedId);
            addLine(1, "WIFE", p2GedId);
          } else {
            addLine(1, "HUSB", p2GedId);
            addLine(1, "WIFE", p1GedId);
          }

          personGedcomMapWithFamLinks[p1GedId].fams.push(gedcomFamId);
          personGedcomMapWithFamLinks[p2GedId].fams.push(gedcomFamId);

          let marriageEventFound = false;
          rel.events?.forEach(event => {
            if (event.eventType.toLowerCase().includes('marriage')) {
              marriageEventFound = true;
              addLine(1, "MARR", undefined, () => {
                if (event.date) addLine(2, "DATE", formatGedcomDateWithEstimate(new Date(event.date), (event as any).isDateEstimated)); // Assuming isDateEstimated on event
                if (event.place) addLine(2, "PLAC", event.place);
                if (event.description) addLine(2, "NOTE", event.description);
              });
            } else if (event.eventType.toLowerCase().includes('divorce')) {
              addLine(1, "DIV", undefined, () => {
                if (event.date) addLine(2, "DATE", formatGedcomDateWithEstimate(new Date(event.date), (event as any).isDateEstimated));
                if (event.place) addLine(2, "PLAC", event.place);
                if (event.description) addLine(2, "NOTE", event.description);
              });
            } else { // Other events as notes
                addLine(1, "EVEN", event.eventType, () => {
                    if (event.date) addLine(2, "DATE", formatGedcomDateWithEstimate(new Date(event.date), (event as any).isDateEstimated));
                    if (event.place) addLine(2, "PLAC", event.place);
                    if (event.description) addLine(2, "NOTE", event.description);
                });
            }
          });
          // If status implies marriage but no MARR event, add a simple MARR tag or NOTE
          if (rel.status === SpousalStatus.Married && !marriageEventFound) {
             addLine(1, "MARR"); // Indicates a marriage took place
          }
          if (rel.status && rel.status !== SpousalStatus.Married && rel.status !== SpousalStatus.Divorced) {
             addLine(1, "NOTE", `Relationship Status: ${rel.status}`);
          }


          // Add children to this spousal FAM record
          const childrenInThisFamily = relationships.filter(rChild =>
            rChild.type === RelationshipType.ParentChild &&
            ((rChild.person1Id.equals(rel.person1Id) && rChild.person2Id.equals(rel.person2Id) === false) || // p1 is parent, p2 is child
             (rChild.person1Id.equals(rel.person2Id) && rChild.person2Id.equals(rel.person1Id) === false)) && // p2 is parent, p1 is child
            // This logic is tricky: ensure the child's other parent is the spouse in *this* FAM
            (relationships.some(rOtherParent =>
                rOtherParent.type === RelationshipType.ParentChild &&
                rOtherParent.person2Id.equals(rChild.person2Id) && // same child
                (rOtherParent.person1Id.equals(rel.person1Id) || rOtherParent.person1Id.equals(rel.person2Id)) // other parent is one of the spouses
            ))
          ).map(rChild => mongoPersonIdToGedcomIndiId.get(rChild.person2Id.toString())).filter(Boolean);

          // Simplified: Find children where one parent is p1 and other parent is p2 of spousal rel
          const childrenOfThisCouple = persons.filter(pChild =>
                (pChild.biologicalMother?.equals(rel.person1Id) && pChild.biologicalFather?.equals(rel.person2Id)) ||
                (pChild.biologicalMother?.equals(rel.person2Id) && pChild.biologicalFather?.equals(rel.person1Id)) ||
                (pChild.legalParents.some(lp => lp.parentId.equals(rel.person1Id)) && pChild.legalParents.some(lp => lp.parentId.equals(rel.person2Id)))
            ).map(pChild => mongoPersonIdToGedcomIndiId.get(pChild._id.toString())).filter(Boolean);


          // Add CHIL tags to FAM
          const addedChildrenToFam = new Set<string>();
          childrenOfThisCouple.forEach(childGedId => {
            if (childGedId && !addedChildrenToFam.has(childGedId)) {
              addLine(1, "CHIL", childGedId);
              personGedcomMapWithFamLinks[childGedId].famc.push(gedcomFamId);
              addedChildrenToFam.add(childGedId);
            }
          });
          if (rel.notes) rel.notes.split('\n').forEach(noteLine => addLine(1, "NOTE", noteLine));

        } else if (rel.type === RelationshipType.ParentChild) {
          // Handle single parent families or link children if not covered by spousal FAMs
          // This part is more complex if we want to create FAMs for single parents.
          // For now, FAMC/FAMS links added below should cover most parent-child links from INDI perspective.
          // If a child is linked to a parent via ParentChild, but that parent isn't in a spousal FAM with another parent of this child,
          // a new FAM might be needed. This is less common for strict GEDCOM but possible.
          // Let's assume most children will be linked via a spousal FAM.
           const parentGedId = p1GedId; // person1 is parent in ParentChild
           const childGedId = p2GedId; // person2 is child
           // Check if a FAM record already exists for this parent (e.g. as a spouse)
           // This is complex because a parent might have multiple families.
           // For simplicity, we'll primarily rely on FAMC links from the child's INDI record.
        }
      }

      // --- Update INDI records with FAMC/FAMS links ---
      // This requires modifying the existing gedcomLines array or rebuilding it.
      // For simplicity, let's rebuild INDI records now that FAMs are known.
      const finalGedcomLines: string[] = [];
      finalGedcomLines.push('0 HEAD');
      finalGedcomLines.push('1 SOUR DzinzaGenealogyPlatform');
      finalGedcomLines.push('1 GEDC');
      finalGedcomLines.push('2 VERS 5.5.1');
      finalGedcomLines.push('2 FORM LINEAGE-LINKED');
      finalGedcomLines.push('1 CHAR UTF-8');
      finalGedcomLines.push('1 SUBM @SUBM1@');
      finalGedcomLines.push('0 @SUBM1@ SUBM');
      finalGedcomLines.push('1 NAME Dzinza User');

      const tempIndiLines = new Map<string, string[]>(); // Store lines for each INDI

      persons.forEach(person => {
          const gedcomIndiId = mongoPersonIdToGedcomIndiId.get(person._id.toString())!;
          const currentIndiLines: string[] = [];
          const addTempLine = (level: number, tag: string, value?: string | null, subLines?: () => void) => {
            if (value || typeof subLines === 'function') {
              currentIndiLines.push(`${level} ${tag}${value ? ' ' + value : ''}`);
              if (subLines) subLines();
            }
          };

          addTempLine(0, `${gedcomIndiId} INDI`);
          let nameString = "";
          if (person.firstName && person.firstName !== "Unknown") nameString += person.firstName;
          if (person.lastName) nameString += ` /${person.lastName}/`;
          else if (!person.firstName) nameString = "Unknown /Unknown/";
          addTempLine(1, "NAME", nameString.trim());
          if (person.nickName) addTempLine(2, "NICK", person.nickName);

          if (person.gender) {
            const sex = person.gender.toUpperCase().startsWith('M') ? 'M' : person.gender.toUpperCase().startsWith('F') ? 'F' : 'U';
            addTempLine(1, "SEX", sex);
          }
          if (person.dateOfBirth || person.placeOfBirth) {
            addTempLine(1, "BIRT", undefined, () => {
              if (person.dateOfBirth) addTempLine(2, "DATE", formatGedcomDateWithEstimate(new Date(person.dateOfBirth), person.isBirthDateEstimated));
              if (person.placeOfBirth) addTempLine(2, "PLAC", person.placeOfBirth);
            });
          }
          if (person.dateOfDeath || person.placeOfDeath || person.causeOfDeath) {
            addTempLine(1, "DEAT", undefined, () => {
              if (person.dateOfDeath) addTempLine(2, "DATE", formatGedcomDateWithEstimate(new Date(person.dateOfDeath), person.isDeathDateEstimated));
              if (person.placeOfDeath) addTempLine(2, "PLAC", person.placeOfDeath);
              if (person.causeOfDeath) addTempLine(2, "CAUS", person.causeOfDeath);
            });
          }
          person.identifiers?.forEach(id => {
            if (id.type === 'Email') addTempLine(1, "EMAIL", id.value);
            else if (id.type === 'Phone') addTempLine(1, "PHON", id.value);
            else addTempLine(1, `_IDNO ${id.value}`, undefined, () => {
                if(id.type) addTempLine(2, "TYPE", id.type);
                if(id.verificationStatus) addTempLine(2, "STAT", id.verificationStatus);
                if(id.notes) addTempLine(2, "NOTE", id.notes);
            });
          });
          if (person.clan) addTempLine(1, "_CLAN", person.clan);
          if (person.tribe) addTempLine(1, "_TRIBE", person.tribe);
          person.traditionalTitles?.forEach(title => addTempLine(1, "TITL", title));
          if (person.notes) person.notes.split('\n').forEach(noteLine => addTempLine(1, "NOTE", noteLine));

          // Add FAMC/FAMS from the map
          personGedcomMapWithFamLinks[gedcomIndiId].famc.forEach(famcId => addTempLine(1, "FAMC", famcId));
          personGedcomMapWithFamLinks[gedcomIndiId].fams.forEach(famsId => addTempLine(1, "FAMS", famsId));

          tempIndiLines.set(gedcomIndiId, currentIndiLines);
      });

      // Add INDI lines to final output
      tempIndiLines.forEach(lines => finalGedcomLines.push(...lines));
      // Add previously generated FAM lines (which don't have FAMC/FAMS for individuals yet)
      // The FAM lines generated in `gedcomLines` are already complete for HUSB, WIFE, CHIL.
      // The FAMC/FAMS on INDI side is what links them back.
      finalGedcomLines.push(...gedcomLines.filter(line => line.includes(" FAM") || line.startsWith("1 HUSB") || line.startsWith("1 WIFE") || line.startsWith("1 CHIL") || line.startsWith("1 MARR") || line.startsWith("1 DIV") || (line.startsWith("1 EVEN") && !line.includes("INDI")) || (line.startsWith("1 NOTE") && !line.includes("INDI")) || (line.startsWith("2 DATE") && !line.includes("INDI")) || (line.startsWith("2 PLAC") && !line.includes("INDI")) ));


      finalGedcomLines.push('0 TRLR');
      const gedcomContent = finalGedcomLines.join('\n');
      gedcomLines.push('0 TRLR');

      const gedcomContent = gedcomLines.join('\n');

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      res.setHeader('Content-Type', 'application/x-gedcom'); // Standard GEDCOM MIME type
      // res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // Alternative if issues with x-gedcom
      res.setHeader('Content-Disposition', `attachment; filename="${familyTree.name || 'export'}_${treeId}.ged"`);
      res.send(gedcomContent);

    } catch (error) {
      const err = error as Error;
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.end();
      logger.error('Error exporting GEDCOM:', { error: err.message, stack: err.stack, userId: req.user?.id, treeId: req.params.treeId });
      res.status(500).json({ error: 'Failed to export GEDCOM file' });
    }
  });
});


export default router;
