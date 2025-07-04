import React, { useState, useEffect, useCallback } from 'react';
import { Collaborator, UserProfile } from '../../types/collaborators'; // Using shared types
// import { Button } from '../ui/Button';
// import { Select } from '../ui/Select';
import { logger } from '@shared/utils/logger';
// Assume useAuth hook is available for current user's ID
// import { useAuth } from '../../hooks/useAuth';
// Assume authService is available for fetching user profiles
// import { authService } from '../../services/api/authService';

// --- Mock useAuth and authService for standalone component development ---
const useAuth = () => ({
  currentUser: { id: 'current-user-id-placeholder' }, // Replace with actual current user ID in ManageCollaboratorsPage
  // Add other auth properties if needed by component logic (e.g. isAdmin for global admin checks)
});

const authService = {
  getUserProfile: async (userId: string): Promise<UserProfile> => {
    logger.info(`Mock authService.getUserProfile called for ${userId}`);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return mock data - in a real app, this would fetch from an API
    if (userId === 'owner-id-placeholder') {
      return { id: userId, name: 'Tree Owner', email: 'owner@example.com' };
    }
    if (userId.includes('admin-collab')) {
         return { id: userId, name: `Admin User ${userId.slice(-2)}`, email: `admin${userId.slice(-2)}@example.com` };
    }
    return { id: userId, name: `User ${userId.slice(0, 5)}`, email: `user${userId.slice(0,5)}@example.com` };
  },
};
// --- End Mocks ---


// Dummy UI components if not available
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?:string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-400 cursor-not-allowed' :
                  (props.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                   (props.variant === 'secondary' ? 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'))}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" {...props}>{children}</select>;


interface CollaboratorsListProps {
  treeId: string;
  collaborators: Collaborator[]; // Raw collaborator data from FamilyTree object
  ownerId: string;
  currentUserRoleOnTree: 'owner' | 'admin' | 'editor' | 'viewer' | null; // Role of the logged-in user on this tree
  onCollaboratorUpdated: () => void; // To refetch tree details or collaborator list
}

interface CollaboratorWithProfile extends Collaborator {
  profile?: UserProfile;
  isLoadingProfile: boolean;
  profileError?: string | null;
}

const CollaboratorsList: React.FC<CollaboratorsListProps> = ({
  treeId,
  collaborators: initialCollaborators,
  ownerId,
  currentUserRoleOnTree,
  onCollaboratorUpdated
}) => {
  const { currentUser } = useAuth(); // Mocked for now, primarily for currentUser.id
  const [collaboratorsWithProfiles, setCollaboratorsWithProfiles] = useState<CollaboratorWithProfile[]>([]);

  const [editingRole, setEditingRole] = useState<Record<string, Collaborator['role']>>({});
  const [actionStates, setActionStates] = useState<Record<string, { isLoading: boolean; error: string | null }>>({});

  const fetchCollaboratorProfiles = useCallback(async (collabs: Collaborator[]) => {
    const newCollabStates = await Promise.all(
      collabs.map(async (collab) => {
        if (collab.userId === ownerId) { // Don't fetch profile for owner if displaying them in this list
          return { ...collab, profile: { id: ownerId, name: 'Tree Owner (You)' }, isLoadingProfile: false };
        }
        try {
          const profile = await authService.getUserProfile(collab.userId);
          return { ...collab, profile, isLoadingProfile: false };
        } catch (err) {
          logger.error(`Failed to fetch profile for ${collab.userId}`, err);
          return { ...collab, profileError: 'Failed to load profile', isLoadingProfile: false };
        }
      })
    );
    setCollaboratorsWithProfiles(newCollabStates);
  }, [ownerId]);


  useEffect(() => {
    const initialStates = initialCollaborators.map(c => ({
      ...c,
      isLoadingProfile: true, // Initially true, will be set to false after fetch
    }));
    setCollaboratorsWithProfiles(initialStates);
    if (initialCollaborators.length > 0) {
      fetchCollaboratorProfiles(initialCollaborators);
    }
  }, [initialCollaborators, fetchCollaboratorProfiles]);


  const handleRoleChange = (userId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    setEditingRole(prev => ({ ...prev, [userId]: newRole }));
  };

  const updateCollaboratorAction = async (collaboratorUserId: string, action: 'updateRole' | 'remove') => {
    setActionStates(prev => ({ ...prev, [collaboratorUserId]: { isLoading: true, error: null } }));
    const newRole = editingRole[collaboratorUserId];

    try {
      let response;
      if (action === 'updateRole') {
        if (!newRole) {
          throw new Error("No new role selected for update.");
        }
        response = await fetch(`/api/family-trees/${treeId}/collaborators/${collaboratorUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
          body: JSON.stringify({ role: newRole }),
        });
      } else { // remove
        response = await fetch(`/api/family-trees/${treeId}/collaborators/${collaboratorUserId}`, {
          method: 'DELETE', // Auth handled globally
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to ${action === 'updateRole' ? 'update role' : 'remove collaborator'}.`);
      }

      onCollaboratorUpdated(); // Refresh list in parent
      setEditingRole(prev => { const newState = {...prev}; delete newState[collaboratorUserId]; return newState; });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setActionStates(prev => ({ ...prev, [collaboratorUserId]: { isLoading: false, error: errorMessage } }));
      logger.error(`Error ${action} for collaborator ${collaboratorUserId}:`, err);
    } finally {
      // Ensure loading is set to false only if there was no error that keeps the state
      setActionStates(prev => {
        if (prev[collaboratorUserId] && !prev[collaboratorUserId].error) { // if no error, clear loading
            return { ...prev, [collaboratorUserId]: { isLoading: false, error: null } };
        }
        return prev; // otherwise keep error state
      });
    }
  };


  if (collaboratorsWithProfiles.length === 0) {
    return <p className="text-sm text-gray-500">No collaborators found for this tree.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name/Email</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {collaboratorsWithProfiles.map((collab) => {
            const isTargetOwner = collab.userId === ownerId;
            const isTargetSelf = collab.userId === currentUser.id;

            const currentActionState = actionStates[collab.userId] || { isLoading: false, error: null };

            // Determine if role select should be shown and what options it should have
            let canEditRole = false;
            const roleOptions: { value: Collaborator['role']; label: string }[] = [
              { value: 'viewer', label: 'Viewer' },
              { value: 'editor', label: 'Editor' },
            ];

            if (currentUserRoleOnTree === 'owner' && !isTargetOwner && !isTargetSelf) {
              canEditRole = true;
              roleOptions.push({ value: 'admin', label: 'Admin' });
            } else if (currentUserRoleOnTree === 'admin' && !isTargetOwner && !isTargetSelf && collab.role !== 'admin') {
              // Admin can edit non-owner, non-self, non-admin collaborators to viewer/editor
              canEditRole = true;
            }
            // If current user is admin, they cannot change another admin's role
            if (currentUserRoleOnTree === 'admin' && collab.role === 'admin' && !isTargetSelf) {
                canEditRole = false;
            }


            // Determine if remove button should be shown
            let canRemove = false;
            if (currentUserRoleOnTree === 'owner' && !isTargetOwner && !isTargetSelf) {
              canRemove = true;
            } else if (currentUserRoleOnTree === 'admin' && !isTargetOwner && !isTargetSelf && collab.role !== 'admin') {
              canRemove = true;
            }
             // Edge case: an admin should not be able to remove themselves if this logic is reached (isTargetSelf check handles it)

            const showSaveRoleButton = canEditRole && editingRole[collab.userId] && editingRole[collab.userId] !== collab.role;

            return (
              <tr key={collab.userId} className={`hover:bg-gray-50 ${isTargetSelf ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {collab.isLoadingProfile ? 'Loading profile...' :
                   collab.profileError ? <span className="text-red-500">{collab.profileError}</span> :
                   (collab.profile?.name || collab.profile?.email || collab.userId)}
                  {isTargetOwner && <span className="ml-2 text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Owner</span>}
                  {isTargetSelf && !isTargetOwner && <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">You</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">
                  {canEditRole ? (
                     <Select
                        value={editingRole[collab.userId] || collab.role}
                        onChange={(e) => handleRoleChange(collab.userId, e.target.value as Collaborator['role'])}
                        disabled={currentActionState.isLoading}
                        aria-label={`Role for ${collab.profile?.name || collab.userId}`}
                      >
                        {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </Select>
                  ) : (
                    collab.role
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {collab.acceptedAt ? new Date(collab.acceptedAt).toLocaleDateString() : 'N/A (Pending)'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2 flex items-center">
                  {showSaveRoleButton && (
                    <Button
                      onClick={() => updateCollaboratorAction(collab.userId, 'updateRole')}
                      disabled={currentActionState.isLoading}
                      size="small"
                    >
                      {currentActionState.isLoading ? 'Saving...' : 'Save Role'}
                    </Button>
                  )}
                  {canRemove && (
                    <Button
                      onClick={() => updateCollaboratorAction(collab.userId, 'remove')}
                      disabled={currentActionState.isLoading}
                      variant="danger"
                      size="small"
                    >
                      {currentActionState.isLoading ? 'Removing...' : 'Remove'}
                    </Button>
                  )}
                  {currentActionState.error && <p className="text-xs text-red-500">{currentActionState.error}</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CollaboratorsList;
