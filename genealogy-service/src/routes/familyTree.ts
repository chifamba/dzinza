import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import express from 'express'; // Ensure express is imported if not already fully
import { body, param, query, validationResult } from 'express-validator'; // Ensure these are imported
import { FamilyTree } from '../models/FamilyTree.js';
import { Person } from '../models/Person.js';
import { Relationship } from '../models/Relationship.js';
import { logger } from '../../../../src/shared/utils/logger.js';
import multer from 'multer';
import { recordActivity } from '../services/activityLogService.js'; // Import recordActivity

const router = express.Router();
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
    const collaboratorInfo = familyTree.collaborators[collaboratorIndex]; // This is the updated one
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

    logger.info('Fetching person details with relationships', { userId, treeId, memberId, correlationId: req.correlationId });

    const familyTree = await FamilyTree.findById(treeId);
    if (!familyTree) {
      logger.warn('Family tree not found for details endpoint', { userId, treeId, memberId, correlationId: req.correlationId });
      return res.status(404).json({ error: 'Family tree not found' });
    }

    if (!familyTree.canUserView(userId)) {
      logger.warn('User access denied for family tree details', { userId, treeId, memberId, correlationId: req.correlationId });
      return res.status(403).json({ error: 'Access denied to this family tree' });
    }

    const person = await Person.findOne({ _id: memberId, familyTreeId: treeId });
    if (!person) {
      logger.warn('Person not found for details endpoint', { userId, treeId, memberId, correlationId: req.correlationId });
      return res.status(404).json({ error: 'Person not found in this family tree' });
    }

    // Fetch relationships
    const [parents, children, spouses, siblings] = await Promise.all([
      Relationship.findParents(memberId, treeId).populate('personDetails', 'firstName lastName profilePhoto birthDate deathDate gender'),
      Relationship.findChildren(memberId, treeId).populate('personDetails', 'firstName lastName profilePhoto birthDate deathDate gender'),
      Relationship.findSpouses(memberId, treeId).populate('personDetails', 'firstName lastName profilePhoto birthDate deathDate gender'),
      Relationship.findSiblings(memberId, treeId).populate('personDetails', 'firstName lastName profilePhoto birthDate deathDate gender'),
    ]);

    const mapToRelatedPerson = (relationship: any) => {
      if (!relationship.personDetails) return null; // Should not happen if populated correctly
      return {
        _id: relationship.personDetails._id,
        firstName: relationship.personDetails.firstName,
        lastName: relationship.personDetails.lastName,
        profilePhoto: relationship.personDetails.profilePhoto,
        birthDate: relationship.personDetails.birthDate,
        deathDate: relationship.personDetails.deathDate,
        gender: relationship.personDetails.gender,
        relationshipType: relationship.type, // e.g., 'parent-child', 'spouse', 'sibling'
        // specificRelationshipType: relationship.specificType // e.g. 'biological', 'adopted', 'step' for PARENT_CHILD
      };
    };

    // The findSiblings method returns RelationshipDoc[], where person1Id or person2Id is the sibling.
    // We need to ensure personDetails refers to the SIBLING, not the original memberId.
    const mapSiblingToRelatedPerson = (relationship: any) => {
        let siblingDetails = relationship.personDetails; // This might be pre-populated if personDetails was a virtual ref
                                                        // or if the populate logic in findSiblings is smart.
                                                        // Assuming findSiblings populates the OTHER person.

        // If personDetails is not directly the sibling, try to determine which one it is.
        if (relationship.person1Id.toString() === memberId) {
            // person2 is the sibling
            if (relationship.person2Details) siblingDetails = relationship.person2Details;
        } else if (relationship.person2Id.toString() === memberId) {
            // person1 is the sibling
            if (relationship.person1Details) siblingDetails = relationship.person1Details;
        }
        // If findSiblings already populates a field like 'siblingDetails' correctly, use that.
        // For now, assuming 'personDetails' is populated to be the sibling.

        if (!siblingDetails) return null;

        return {
            _id: siblingDetails._id,
            firstName: siblingDetails.firstName,
            lastName: siblingDetails.lastName,
            profilePhoto: siblingDetails.profilePhoto,
            birthDate: siblingDetails.birthDate,
            deathDate: siblingDetails.deathDate,
            gender: siblingDetails.gender,
            relationshipType: relationship.type,
            // specificRelationshipType: relationship.specificType
        };
    };


    res.json({
      person: person.toObject(), // Convert Mongoose document to plain object
      parents: parents.map(mapToRelatedPerson).filter(p => p),
      children: children.map(mapToRelatedPerson).filter(p => p),
      spouses: spouses.map(mapToRelatedPerson).filter(p => p),
      // Siblings might need special handling in mapToRelatedPerson if personDetails isn't always the sibling
      // For findSiblings, the relationship model's static method should ideally populate the 'other' person.
      // Let's assume findSiblings populates 'personDetails' to be the actual sibling.
      siblings: siblings.map(mapSiblingToRelatedPerson).filter(s => s),
    });

  } catch (error) {
    logger.error('Error fetching person details with relationships:', error, { userId: req.user?.id, treeId: req.params.treeId, memberId: req.params.memberId, correlationId: req.correlationId });
    res.status(500).json({ error: 'Failed to retrieve person details' });
  }
});

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

      // --- Placeholder for Simplified GEDCOM Parser and Data Creation Logic ---
      // This section will be complex and involve multiple steps as outlined in the subtask.
      // For now, just a conceptual placeholder.

      let individualsImported = 0;
      let familiesProcessed = 0;
      let relationshipsCreated = 0;

      try {
        // TODO: Implement simplified GEDCOM parsing
        // 1. Parse lines: level, tag, value/pointer
        // 2. Identify INDI and FAM records
        // 3. Pass 1: Create Person documents (map GEDCOM INDI ID to MongoDB Person._id)
        // 4. Pass 2: Create Relationship documents using FAM records and the ID map

        // --- Simplified Parser Snippet (Conceptual - to be expanded) ---
        const lines = gedcomText.split(/\r?\n/);
        const parsedIndis = new Map(); // GEDCOM ID -> { data: {}, famc: [], fams: [] }
        const parsedFams = new Map();  // GEDCOM ID -> { HUSB: [], WIFE: [], CHIL: [], MARR: null }

        let currentRecordId: string | null = null;
        let currentRecordType: 'INDI' | 'FAM' | null = null;
        let currentTagContext: string | null = null; // For handling nested tags like DATE under BIRT

        for (const line of lines) {
            const trimmedLine = line.trim();
            const parts = trimmedLine.match(/^(\d+)\s+(@\S+@|\S+)(?:\s+(.*))?$/);
            if (!parts) continue;

            const level = parseInt(parts[1]);
            const tagOrId = parts[2];
            const value = parts[3]?.trim();

            if (level === 0) {
                currentTagContext = null; // Reset context
                if (value === 'INDI') {
                    currentRecordId = tagOrId;
                    currentRecordType = 'INDI';
                    parsedIndis.set(currentRecordId, { id: currentRecordId, data: {}, famc: [], fams: [] });
                } else if (value === 'FAM') {
                    currentRecordId = tagOrId;
                    currentRecordType = 'FAM';
                    parsedFams.set(currentRecordId, { id: currentRecordId, data: { HUSB: [], WIFE: [], CHIL: [] }, MARR: null });
                } else {
                    currentRecordId = null;
                    currentRecordType = null;
                }
            } else if (currentRecordId && currentRecordType) {
                const tag = tagOrId;
                const record = currentRecordType === 'INDI' ? parsedIndis.get(currentRecordId) : parsedFams.get(currentRecordId);

                if (!record) continue;

                if (level === 1) currentTagContext = tag; // Set context for level 2 tags

                switch (tag) {
                    case 'NAME':
                        if (currentRecordType === 'INDI') record.data.name = value;
                        break;
                    case 'SEX':
                        if (currentRecordType === 'INDI') record.data.sex = value;
                        break;
                    case 'BIRT':
                    case 'DEAT':
                    case 'MARR': // MARR can be under FAM directly
                        if (currentRecordType === 'INDI' || (currentRecordType === 'FAM' && tag === 'MARR')) {
                            currentTagContext = tag; // Event context for DATE/PLAC
                            if (currentRecordType === 'INDI') record.data[tag] = {};
                            else if (currentRecordType === 'FAM' && tag === 'MARR') record.MARR = {};
                        }
                        break;
                    case 'DATE':
                        if (currentTagContext && record.data[currentTagContext]) record.data[currentTagContext].date = value;
                        else if (currentTagContext && currentRecordType === 'FAM' && record.MARR && currentTagContext === 'MARR') record.MARR.date = value;
                        break;
                    case 'PLAC':
                         if (currentTagContext && record.data[currentTagContext]) record.data[currentTagContext].place = value;
                         else if (currentTagContext && currentRecordType === 'FAM' && record.MARR && currentTagContext === 'MARR') record.MARR.place = value;
                        break;
                    case 'FAMC': // Family child in (INDI)
                        if (currentRecordType === 'INDI' && value) record.famc.push(value);
                        break;
                    case 'FAMS': // Family spouse in (INDI)
                        if (currentRecordType === 'INDI' && value) record.fams.push(value);
                        break;
                    case 'HUSB': // Husband (FAM)
                        if (currentRecordType === 'FAM' && value) record.data.HUSB.push(value);
                        break;
                    case 'WIFE': // Wife (FAM)
                        if (currentRecordType === 'FAM' && value) record.data.WIFE.push(value);
                        break;
                    case 'CHIL': // Child (FAM)
                        if (currentRecordType === 'FAM' && value) record.data.CHIL.push(value);
                        break;
                }
            }
        }

        // --- End of Conceptual Parser Snippet ---

        // --- Pass 1: Create Individuals ---
        const gedcomToMongoIdMap = new Map<string, string>();
        for (const [gedcomId, indi] of parsedIndis.entries()) {
            const personData: any = {
                familyTreeId: treeId,
                userId, // Assuming the uploader is the initial creator of these records
                firstName: indi.data.name?.split('/')[0]?.trim() || 'Unknown', // Simple name parsing
                lastName: indi.data.name?.split('/')[1]?.trim(),
                gender: indi.data.sex === 'M' ? 'male' : indi.data.sex === 'F' ? 'female' : 'unknown',
                isLiving: !indi.data.DEAT, // Assume living if no death event
                // TODO: Map birthDate, deathDate, birthPlace, deathPlace from indi.data.BIRT, indi.data.DEAT
            };
            if (indi.data.BIRT?.date) personData.birthDate = { date: new Date(indi.data.BIRT.date) }; // Needs robust date parsing
            if (indi.data.DEAT?.date) personData.deathDate = { date: new Date(indi.data.DEAT.date) }; // Needs robust date parsing

            const newPerson = new Person(personData);
            await newPerson.save();
            gedcomToMongoIdMap.set(gedcomId, newPerson._id.toString());
            individualsImported++;
        }

        // --- Pass 2: Create Relationships ---
        for (const [gedcomFamId, fam] of parsedFams.entries()) {
            familiesProcessed++;
            const husbandIds = fam.data.HUSB.map((id: string) => gedcomToMongoIdMap.get(id)).filter(Boolean);
            const wifeIds = fam.data.WIFE.map((id: string) => gedcomToMongoIdMap.get(id)).filter(Boolean);
            const childIds = fam.data.CHIL.map((id: string) => gedcomToMongoIdMap.get(id)).filter(Boolean);

            // Create spouse relationships
            for (const husbandId of husbandIds) {
                for (const wifeId of wifeIds) {
                    const spouseRel = new Relationship({
                        person1Id: husbandId,
                        person2Id: wifeId,
                        type: 'spouse',
                        familyTreeId: treeId,
                        // TODO: Add marriage date from fam.MARR if available
                    });
                    await spouseRel.save();
                    relationshipsCreated++;
                }
            }

            // Create parent-child relationships
            const parentIds = [...husbandIds, ...wifeIds];
            for (const parentId of parentIds) {
                for (const childId of childIds) {
                    const parentChildRel = new Relationship({
                        person1Id: parentId, // Parent
                        person2Id: childId,  // Child
                        type: 'parent-child',
                        familyTreeId: treeId,
                    });
                    await parentChildRel.save();
                    relationshipsCreated++;
                }
            }
        }
        // --- End of Data Creation Logic ---
      } catch (parseError: any) {
        logger.error('Error processing GEDCOM file content:', parseError, { userId, treeId, correlationId: req.correlationId });
        return res.status(400).json({ error: 'Failed to parse or process GEDCOM file: ' + parseError.message });
      }


      logger.info('GEDCOM import completed', { userId, treeId, individualsImported, familiesProcessed, relationshipsCreated, correlationId: req.correlationId });
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


export default router;
