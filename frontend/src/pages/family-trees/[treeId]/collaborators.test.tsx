import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/router';
import ManageCollaboratorsPage from './collaborators'; // Adjust path if page is not in root of [treeId]
import { FamilyTreeDetails, Invitation, Collaborator, UserProfile } from '../../../types/collaborators';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth hook
const mockCurrentUser: UserProfile | null = { id: 'current-user-123', name: 'Current Test User', email: 'current@example.com' };
jest.mock('../../../hooks/useAuth', () => ({ // Adjust path to your useAuth hook
  useAuth: () => ({ currentUser: mockCurrentUser, isLoading: false }),
}));

// Mock fetch
global.fetch = jest.fn();

const mockTreeId = 'test-tree-id-123';

const mockFamilyTree: FamilyTreeDetails = {
  _id: mockTreeId,
  name: 'The Test Family Tree',
  ownerId: 'owner-user-456',
  collaborators: [
    { userId: 'collab-user-789', role: 'editor', acceptedAt: new Date().toISOString() },
    { userId: mockCurrentUser!.id, role: 'admin', acceptedAt: new Date().toISOString() }, // Current user is an admin
  ],
  privacy: 'private',
  currentUserRole: 'admin', // Assuming backend provides this based on our previous discussions
};

const mockPendingInvitations: Invitation[] = [
  {
    _id: 'invite-1',
    familyTreeId: mockTreeId,
    inviteeEmail: 'pending@example.com',
    permissionLevel: 'viewer',
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString() , // Expires tomorrow
    inviterUserId: 'owner-user-456',
    updatedAt: new Date().toISOString(),
  },
];

// Mock authService (used by CollaboratorsList, though not directly tested here, good for consistency)
jest.mock('../../../services/api/authService', () => ({ // Adjust path
    authService: {
        getUserProfile: jest.fn().mockImplementation(async (userId: string) => {
            if (userId === 'owner-user-456') return { id: userId, name: 'Tree Owner', email: 'owner@example.com' };
            if (userId === 'collab-user-789') return { id: userId, name: 'Collaborator One', email: 'collab1@example.com' };
            if (userId === mockCurrentUser!.id) return { id: userId, name: mockCurrentUser!.name, email: mockCurrentUser!.email };
            return { id: userId, name: `User ${userId.substring(0,5)}`, email: `${userId.substring(0,5)}@example.com`};
        })
    }
}));


describe('ManageCollaboratorsPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      query: { treeId: mockTreeId },
      isReady: true, // Important for useEffects that depend on router.query
    });
    (fetch as jest.Mock).mockClear();

    // Default mock implementations
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes(`/api/family-trees/${mockTreeId}/invitations`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPendingInvitations), // Returns array directly
        });
      }
      if (url.includes(`/api/family-trees/${mockTreeId}`)) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockFamilyTree),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Unhandled API call' }) });
    });
  });

  it('fetches and renders tree name, collaborators, and pending invitations', async () => {
    render(<ManageCollaboratorsPage />);

    await waitFor(() => {
      expect(screen.getByText(`Manage Collaborators`)).toBeInTheDocument();
      expect(screen.getByText(`For Family Tree: ${mockFamilyTree.name}`)).toBeInTheDocument();
    });

    // Check if API calls were made
    expect(fetch).toHaveBeenCalledWith(`/api/family-trees/${mockTreeId}`);
    expect(fetch).toHaveBeenCalledWith(`/api/family-trees/${mockTreeId}/invitations?status=pending`);

    // Check for collaborator and invitation details (simple checks)
    await waitFor(() => {
        // From mockFamilyTree.collaborators (owner is not listed here, current user is admin)
        expect(screen.getByText(/Collaborator One/i)).toBeInTheDocument(); // Name from mocked getUserProfile
        // From mockPendingInvitations
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    });
  });

  it('simulates submitting the "Invite Collaborator" form', async () => {
    render(<ManageCollaboratorsPage />);

    // Wait for initial data load
    await waitFor(() => expect(screen.getByText(`For Family Tree: ${mockFamilyTree.name}`)).toBeInTheDocument());

    // Mock a successful invitation POST
    (fetch as jest.Mock).mockImplementationOnce((url:string, options: RequestInit) => {
        if (options.method === 'POST' && url.includes(`/api/family-trees/${mockTreeId}/invitations`)) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ _id: 'new-invite-id', inviteeEmail: 'new@example.com', permissionLevel: 'editor', status: 'pending' })
            });
        }
        // Fallback for initial GET calls
        if (url.includes(`/api/family-trees/${mockTreeId}/invitations`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPendingInvitations) });
        if (url.includes(`/api/family-trees/${mockTreeId}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFamilyTree) });
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Unhandled API call' }) });
    });

    fireEvent.change(screen.getByLabelText(/Invitee Email/i), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText(/Permission Level/i), { target: { value: 'editor' } });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Send Invitation/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/family-trees/${mockTreeId}/invitations`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'new@example.com', permissionLevel: 'editor' }),
        })
      );
      // Check for success message (if your component shows one)
      expect(screen.getByText(/Invitation sent successfully to new@example.com/i)).toBeInTheDocument();
    });
  });

  it('simulates clicking "Revoke" on a pending invitation', async () => {
    render(<ManageCollaboratorsPage />);

    await waitFor(() => expect(screen.getByText('pending@example.com')).toBeInTheDocument());

    // Mock successful DELETE
    (fetch as jest.Mock).mockImplementationOnce((url: string, options: RequestInit) => {
        if (options.method === 'DELETE' && url.includes(`/api/family-trees/${mockTreeId}/invitations/${mockPendingInvitations[0]._id}`)) {
            return Promise.resolve({ ok: true, status: 204 }); // No content on successful delete
        }
         // Fallback for initial GET calls (needed if onInvitationRevoked refetches)
        if (url.includes(`/api/family-trees/${mockTreeId}/invitations`)) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) }); // Return empty after revoke
        if (url.includes(`/api/family-trees/${mockTreeId}`)) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFamilyTree) });
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ message: 'Unhandled API call' }) });
    });

    const revokeButtons = await screen.findAllByRole('button', { name: /Revoke/i });
    await act(async () => {
        fireEvent.click(revokeButtons[0]);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/family-trees/${mockTreeId}/invitations/${mockPendingInvitations[0]._id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
      // After successful revoke and refetch, the item should be gone
      expect(screen.queryByText('pending@example.com')).not.toBeInTheDocument();
    });
  });

  // TODO: Add tests for CollaboratorsList interactions (update role, remove collaborator)
  // This would require more complex mocking for currentUser's role on the tree to test permissions.
});
