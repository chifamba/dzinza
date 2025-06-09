// src/types/collaborators.ts

export interface Invitation {
  _id: string;
  familyTreeId: string;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  permissionLevel: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  token?: string; // Token might not always be sent to client, e.g., when listing invites
  expiresAt: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface Collaborator {
  userId: string;
  role: 'viewer' | 'editor' | 'admin';
  invitedAt?: string; // ISO date string
  acceptedAt?: string; // ISO date string
  // The FamilyTree model might directly populate user details here in some cases,
  // or we fetch them separately as planned for CollaboratorsList.
  // For now, this is the base structure from familyTree.collaborators array.
  user?: { // Optional: if backend populates some user details directly
    name?: string;
    email?: string;
  };
}

export interface FamilyTreeDetails {
  _id: string;
  name: string;
  ownerId: string;
  collaborators: Collaborator[];
  // other family tree fields if needed
}

// For user profiles fetched by authService.getUserProfile
export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  // other profile fields
}
