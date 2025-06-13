import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator'; // Added query
import crypto from 'crypto';
import mongoose from 'mongoose';

import { Invitation, IInvitation } from '../models/Invitation';
import { FamilyTree, IFamilyTree } from '../models/FamilyTree'; // Assuming FamilyTree model path
// import { User } from '../models/User'; // If direct User model interaction is needed from this service
import { authMiddleware } from '@shared/middleware/auth';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// --- Helper: Check if user can manage tree (owner or admin collaborator) ---
// This might be a method on the FamilyTree model itself, e.g., familyTree.canManage(userId)
// For now, let's assume a simplified check or that FamilyTree model has such a method.
// If FamilyTree.canUserManage is not available, a direct check would be:
// const canManage = tree.ownerUserId.toString() === userId || tree.collaborators.some(c => c.userId.toString() === userId && c.role === 'admin' && c.status === 'accepted');

// --- Route to create an invitation for a family tree ---
router.post(
  '/family-trees/:treeId/invitations',
  authMiddleware,
  [
    param('treeId').isMongoId().withMessage('Invalid Family Tree ID.'),
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required for the invitee.'),
    body('permissionLevel')
      .isIn(['viewer', 'editor'])
      .withMessage('Permission level must be either "viewer" or "editor".'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId } = req.params;
    const { email: inviteeEmail, permissionLevel } = req.body;
    const inviterUserId = req.user?.id;

    if (!inviterUserId) {
      // Should be caught by authMiddleware, but as a safeguard
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId).populate('collaborators.userId'); // Populate to check collaborator emails/IDs
      if (!familyTree) {
        return res.status(404).json({ message: 'Family Tree not found.' });
      }

      // Authorization: Check if the authenticated user can manage this tree
      // Assuming FamilyTree model has a method `canUserManage(userId, permissionType = 'manageInvitations')`
      // or a simpler `isOwnerOrAdmin(userId)` check.
      // For this example, let's use a direct check:
      const isOwner = familyTree.ownerUserId.toString() === inviterUserId;
      const isAdminCollaborator = familyTree.collaborators.some(
        c => c.userId && (c.userId as any)._id.toString() === inviterUserId && c.role === 'admin' && c.status === 'accepted'
      );

      if (!isOwner && !isAdminCollaborator) {
        return res.status(403).json({ message: 'You do not have permission to invite users to this Family Tree.' });
      }

      if (!familyTree.settings?.allowCollaboration) {
        return res.status(400).json({ message: 'Collaboration is not enabled for this Family Tree.' });
      }

      // Prevent inviting oneself
      // This check might need adjustment if req.user does not contain email directly
      // or if User model is needed to compare inviterUserId's email with inviteeEmail
      if (req.user.email && req.user.email.toLowerCase() === inviteeEmail.toLowerCase()) {
         return res.status(400).json({ message: 'You cannot invite yourself to the Family Tree.' });
      }

      // Check if invitee is already the owner
      if (familyTree.ownerUserId.toString() === req.user.id && req.user.email && req.user.email.toLowerCase() === inviteeEmail.toLowerCase()) {
        // This case is a bit complex: if the owner's email matches inviteeEmail.
        // If owner's ID is different from inviterUserId, this means an admin is trying to invite the owner, which is redundant.
        // If inviter IS owner, this is covered by "cannot invite yourself".
        // For now, this specific check for owner might be redundant due to the self-invite check.
      }


      // Check if invitee (by email or resolved User ID) is already a collaborator
      // This requires resolving inviteeEmail to a User ID if they are an existing user.
      // For simplicity, if a User model and lookup is not readily available, this check might be basic.
      // A more robust check would involve:
      // 1. Find User by inviteeEmail.
      // 2. If user exists, check if that userId is already a collaborator.
      // 3. If user does not exist, check if any collaborator was invited with this email (if email stored on collab).
      const existingCollaboratorByEmail = familyTree.collaborators.find(c => {
        const collaboratorUser = c.userId as any; // Assuming userId is populated with user object having an email
        return collaboratorUser?.email?.toLowerCase() === inviteeEmail.toLowerCase() && c.status === 'accepted';
      });
      if (existingCollaboratorByEmail) {
          return res.status(400).json({ message: 'This email is already associated with an active collaborator on this Family Tree.' });
      }
      // Also check if the inviteeEmail is the owner's email (if not already handled by self-invite)
      // This would require fetching owner's user object to get their email if not on req.user
      // For now, we assume req.user.email is the inviter's email.

      // Check for existing PENDING invitation for the same tree and email
      const existingPendingInvite = await Invitation.findOne({
        familyTreeId: treeId,
        inviteeEmail: inviteeEmail.toLowerCase(),
        status: 'pending',
        expiresAt: { $gt: new Date() }, // Only consider non-expired pending invites
      });

      if (existingPendingInvite) {
        logger.info(`Active pending invitation already exists for ${inviteeEmail} on tree ${treeId}. ID: ${existingPendingInvite._id}`);
        // Option 1: Return the existing one (potentially with a specific message)
        // Option 2: Prevent creating a new one (as implemented here)
        return res.status(409).json({
            message: 'An active pending invitation for this email already exists for this tree. It must be accepted, declined, or revoked before sending a new one.',
            invitationId: existingPendingInvite._id
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const newInvitation = new Invitation({
        familyTreeId: new mongoose.Types.ObjectId(treeId),
        inviterUserId,
        inviteeEmail: inviteeEmail.toLowerCase(),
        // inviteeUserId: can be set here if user is found by email, otherwise later
        permissionLevel,
        status: 'pending',
        token,
        expiresAt,
      });

      await newInvitation.save();

      // Placeholder for sending email
      logger.info(`TODO: Send invitation email to ${newInvitation.inviteeEmail} for tree ${familyTree.name} (ID: ${treeId}). Token: ${token}. Link: /accept-invitation?token=${token}`);

      // Decide on response: Exclude token for security if client doesn't need it immediately.
      // For admin display or testing, it might be useful.
      const invitationResponse = newInvitation.toObject();
      // delete invitationResponse.token; // Uncomment to hide token from response

      res.status(201).json(invitationResponse);
    } catch (error) {
      logger.error('Error creating invitation:', error);
      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ message: 'Validation error creating invitation.', details: error.errors });
      }
      res.status(500).json({ message: 'Server error while creating invitation.' });
    }
  }
);

// --- Route to list invitations for a specific family tree (for tree admins/owners) ---
router.get(
  '/family-trees/:treeId/invitations',
  authMiddleware,
  [
    param('treeId').isMongoId().withMessage('Invalid Family Tree ID.'),
    query('status').optional().isIn(['pending', 'accepted', 'declined', 'revoked'])
      .withMessage('Invalid status value. Allowed values: pending, accepted, declined, revoked.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId } = req.params;
    const requestedStatus = req.query.status as string | undefined;
    const requesterUserId = req.user?.id;

    if (!requesterUserId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId);
      if (!familyTree) {
        return res.status(404).json({ message: 'Family Tree not found.' });
      }

      // Authorization check (owner or admin)
      const isOwner = familyTree.ownerUserId.toString() === requesterUserId;
      const isAdminCollaborator = familyTree.collaborators.some(
        c => c.userId && c.userId.toString() === requesterUserId && c.role === 'admin' && c.status === 'accepted'
      );

      if (!isOwner && !isAdminCollaborator) {
        return res.status(403).json({ message: 'You do not have permission to view invitations for this Family Tree.' });
      }

      const queryFilter: any = { familyTreeId: treeId };
      if (requestedStatus) {
        queryFilter.status = requestedStatus;
      } else {
        queryFilter.status = 'pending'; // Default to pending if no status is specified
      }

      // Consider which fields to select. Token might not be needed for listing.
      const invitations = await Invitation.find(queryFilter)
        .select('-token') // Exclude token from the list view for security
        .sort({ createdAt: -1 }); // Sort by creation date descending

      res.status(200).json(invitations);

    } catch (error) {
      logger.error(`Error fetching invitations for tree ${treeId}:`, error);
      res.status(500).json({ message: 'Server error while fetching invitations.' });
    }
  }
);

// --- Route to revoke a PENDING invitation (for tree admins/owners) ---
router.delete(
  '/family-trees/:treeId/invitations/:invitationId',
  authMiddleware,
  [
    param('treeId').isMongoId().withMessage('Invalid Family Tree ID.'),
    param('invitationId').isMongoId().withMessage('Invalid Invitation ID.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { treeId, invitationId } = req.params;
    const requesterUserId = req.user?.id;

    if (!requesterUserId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const familyTree = await FamilyTree.findById(treeId);
      if (!familyTree) {
        return res.status(404).json({ message: 'Family Tree not found.' });
      }

      // Authorization check
      const isOwner = familyTree.ownerUserId.toString() === requesterUserId;
      const isAdminCollaborator = familyTree.collaborators.some(
        c => c.userId && c.userId.toString() === requesterUserId && c.role === 'admin' && c.status === 'accepted'
      );

      if (!isOwner && !isAdminCollaborator) {
        return res.status(403).json({ message: 'You do not have permission to manage invitations for this Family Tree.' });
      }

      const invitation = await Invitation.findById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found.' });
      }

      // Verify invitation belongs to the specified tree
      if (invitation.familyTreeId.toString() !== treeId) {
        return res.status(400).json({ message: 'Invitation does not belong to the specified Family Tree.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({
          message: `Only pending invitations can be revoked. This invitation is currently: ${invitation.status}.`
        });
      }

      invitation.status = 'revoked';
      await invitation.save();

      logger.info(`Invitation ${invitationId} for tree ${treeId} was revoked by user ${requesterUserId}.`);
      // TODO: Consider notifying the invitee that their invitation was revoked.

      res.status(200).json(invitation); // Return the updated invitation
      // Alternatively, res.status(204).send(); for No Content response
    } catch (error) {
      logger.error(`Error revoking invitation ${invitationId} for tree ${treeId}:`, error);
      res.status(500).json({ message: 'Server error while revoking invitation.' });
    }
  }
);


// --- Route to verify an invitation token ---
router.get(
  '/invitations/verify', // Using /invitations/verify?token=...
  [
    // Using query validator for token
    query('token').notEmpty().isHexadecimal().withMessage('Invitation token is required and must be a valid hexadecimal string.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Token is validated by express-validator and available in req.query
    const token = req.query.token as string;

    try {
      const invitation = await Invitation.findOne({ token })
        .populate<{ familyTreeId: IFamilyTree }>('familyTreeId', 'name'); // Populate tree name

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or token is invalid.' });
      }

      if (invitation.status !== 'pending') {
        let message = 'This invitation cannot be used.';
        if (invitation.status === 'accepted') message = 'This invitation has already been accepted.';
        else if (invitation.status === 'declined') message = 'This invitation has been declined.';
        else if (invitation.status === 'revoked') message = 'This invitation has been revoked.';
        return res.status(410).json({ message, status: invitation.status });
      }

      if (invitation.expiresAt < new Date()) {
        // Optionally update status to 'expired' here if not using TTL or for explicit state
        // invitation.status = 'expired'; await invitation.save();
        return res.status(410).json({ message: 'This invitation has expired.', status: 'expired' });
      }

      if (!invitation.familyTreeId) {
        logger.error(`Invitation ${invitation._id} is missing populated familyTreeId details.`);
        return res.status(500).json({ message: 'Could not retrieve family tree details for this invitation.' });
      }

      // If inviter's name is needed, and not stored on invitation, an additional fetch/service call would be here.
      // For example: const inviterProfile = await fetchUserService.getUserProfile(invitation.inviterUserId);
      // const inviterName = inviterProfile ? inviterProfile.name : 'An existing user';

      res.status(200).json({
        invitationId: invitation._id, // Good to send to client for accept/decline actions
        familyTreeId: invitation.familyTreeId._id,
        familyTreeName: invitation.familyTreeId.name,
        inviterId: invitation.inviterUserId, // inviterName could be added here
        inviteeEmail: invitation.inviteeEmail,
        permissionLevel: invitation.permissionLevel,
        status: invitation.status, // Should be 'pending'
        expiresAt: invitation.expiresAt,
      });
    } catch (error) {
      logger.error('Error verifying invitation token:', error);
      res.status(500).json({ message: 'Server error while verifying invitation.' });
    }
  }
);

// --- Route to accept an invitation ---
router.post(
  '/invitations/accept',
  authMiddleware,
  [
    query('token').notEmpty().isHexadecimal().withMessage('Invitation token is required and must be valid.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const token = req.query.token as string;
    const loggedInUserId = req.user?.id;
    const loggedInUserEmail = req.user?.email; // Assuming email is on req.user

    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const invitation = await Invitation.findOne({ token });

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or token is invalid.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(410).json({ message: `Invitation is no longer pending (status: ${invitation.status}).` });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(410).json({ message: 'This invitation has expired.' });
      }

      // Verify if the logged-in user is the intended recipient
      let isIntendedRecipient = false;
      if (invitation.inviteeUserId) {
        isIntendedRecipient = invitation.inviteeUserId === loggedInUserId;
      } else if (loggedInUserEmail) {
        isIntendedRecipient = invitation.inviteeEmail.toLowerCase() === loggedInUserEmail.toLowerCase();
      } else {
        // If inviteeUserId is not set and we don't have user's email, this is problematic.
        // For now, we'll assume this scenario means we can't confirm.
        logger.warn(`Cannot verify invitee for invitation ${invitation._id} as inviteeUserId is not set and user email is not available from token.`);
        return res.status(403).json({ message: 'Cannot confirm you are the intended recipient of this invitation without more details.' });
      }

      if (!isIntendedRecipient) {
        return res.status(403).json({ message: 'This invitation is not addressed to you.' });
      }

      const familyTree = await FamilyTree.findById(invitation.familyTreeId);
      if (!familyTree) {
        // This case should be rare if invitation is valid, implies data inconsistency
        logger.error(`FamilyTree with ID ${invitation.familyTreeId} not found for an active invitation ${invitation._id}`);
        return res.status(404).json({ message: 'Associated Family Tree not found.' });
      }

      // Add or update collaborator
      let collaborator = familyTree.collaborators.find(c => c.userId && c.userId.toString() === loggedInUserId);

      if (collaborator) {
        // User is already a collaborator, update role and status if necessary
        collaborator.role = invitation.permissionLevel;
        collaborator.status = 'accepted'; // Ensure status is accepted
        collaborator.acceptedAt = new Date();
        collaborator.invitedAt = collaborator.invitedAt || invitation.createdAt; // Keep original invitedAt if exists
        logger.info(`Updated collaborator ${loggedInUserId} on tree ${familyTree._id} to role ${invitation.permissionLevel}.`);
      } else {
        // Add new collaborator
        familyTree.collaborators.push({
          userId: new mongoose.Types.ObjectId(loggedInUserId), // Ensure it's an ObjectId
          role: invitation.permissionLevel,
          invitedAt: invitation.createdAt,
          acceptedAt: new Date(),
          status: 'accepted',
        });
        logger.info(`Added new collaborator ${loggedInUserId} to tree ${familyTree._id} with role ${invitation.permissionLevel}.`);
      }

      await familyTree.save();

      // Update invitation
      invitation.status = 'accepted';
      invitation.inviteeUserId = loggedInUserId; // Ensure inviteeUserId is set
      await invitation.save();

      logger.info(`TODO: Notify inviter ${invitation.inviterUserId} that invitation ${invitation._id} for tree ${familyTree.name} was accepted by ${loggedInUserId}.`);

      res.status(200).json({
        message: 'Invitation accepted successfully.',
        familyTreeId: familyTree._id,
        familyName: familyTree.name,
        permissionLevel: invitation.permissionLevel,
      });

    } catch (error) {
      logger.error('Error accepting invitation:', error);
      res.status(500).json({ message: 'Server error while accepting invitation.' });
    }
  }
);

// --- Route to decline an invitation ---
router.post(
  '/invitations/decline',
  authMiddleware, // Keeping it authenticated for now
  [
    query('token').notEmpty().isHexadecimal().withMessage('Invitation token is required and must be valid.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const token = req.query.token as string;
    const loggedInUserId = req.user?.id;
    const loggedInUserEmail = req.user?.email;

    if (!loggedInUserId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const invitation = await Invitation.findOne({ token });

      if (!invitation) {
        return res.status(404).json({ message: 'Invitation not found or token is invalid.' });
      }

      if (invitation.status !== 'pending') {
        return res.status(410).json({ message: `Invitation is no longer pending (status: ${invitation.status}).` });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(410).json({ message: 'This invitation has expired.' });
      }

      // Verify if the logged-in user is the intended recipient (optional but good practice)
      let isIntendedRecipient = false;
      if (invitation.inviteeUserId) {
        isIntendedRecipient = invitation.inviteeUserId === loggedInUserId;
      } else if (loggedInUserEmail) {
        isIntendedRecipient = invitation.inviteeEmail.toLowerCase() === loggedInUserEmail.toLowerCase();
      } else {
        logger.warn(`Cannot verify invitee for declining invitation ${invitation._id} as inviteeUserId is not set and user email is not available.`);
        // Allow decline even if email not on req.user, as token identifies the invite.
        // However, if inviteeUserId IS set and doesn't match, then it's a mismatch.
        if (invitation.inviteeUserId && invitation.inviteeUserId !== loggedInUserId) {
             return res.status(403).json({ message: 'This invitation is not addressed to you.' });
        }
        isIntendedRecipient = true; // Allows decline if email unknown but inviteeUserId not set or matches
      }

      if (!isIntendedRecipient && invitation.inviteeUserId && invitation.inviteeUserId !== loggedInUserId) {
         // This condition is a bit redundant due to the block above but ensures clarity.
        return res.status(403).json({ message: 'This invitation is not addressed to you.' });
      }


      invitation.status = 'declined';
      invitation.inviteeUserId = loggedInUserId; // Associate the user who declined
      await invitation.save();

      logger.info(`TODO: Notify inviter ${invitation.inviterUserId} that invitation ${invitation._id} was declined by ${loggedInUserId}.`);

      res.status(200).json({ message: 'Invitation declined successfully.' });

    } catch (error) {
      logger.error('Error declining invitation:', error);
      res.status(500).json({ message: 'Server error while declining invitation.' });
    }
  }
);

export default router;
