import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { FamilyTreeDetails, Invitation, Collaborator, UserProfile } from '../../../types/collaborators'; // Adjust path if types are elsewhere

import InviteCollaboratorForm from '../../../components/family-trees/InviteCollaboratorForm';
import PendingInvitationsList from '../../../components/family-trees/PendingInvitationsList';
import CollaboratorsList from '../../../components/family-trees/CollaboratorsList';

// Assuming a shared logger
import { logger } from '@shared/utils/logger';
// Assuming useAuth hook
// import { useAuth } from '../../../hooks/useAuth';

// --- Mock useAuth for standalone page development ---
const useAuth = () => ({
  currentUser: { id: 'current-user-id-placeholder', name: 'Current User Name', email: 'current@example.com' }, // Replace with actual logic
  // loading: false,
  // error: null,
});
// --- End Mock ---

// Dummy Loading component
const LoadingSpinner = () => <div className="text-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-2 text-gray-500">Loading...</p></div>;


const ManageCollaboratorsPage: React.FC = () => {
  const router = useRouter();
  const { treeId } = router.query as { treeId: string };
  const { currentUser } = useAuth(); // Mocked for now

  const [familyTree, setFamilyTree] = useState<FamilyTreeDetails | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);


  const fetchFamilyTreeDetails = useCallback(async () => {
    if (!treeId) return;
    setIsLoadingTree(true);
    setError(null);
    try {
      const response = await fetch(`/api/family-trees/${treeId}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Failed to fetch family tree details. Status: ${response.status}`);
      }
      const data: FamilyTreeDetails = await response.json();
      setFamilyTree(data);
    } catch (err) {
      logger.error(`Error fetching family tree ${treeId}:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching tree details.');
      setFamilyTree(null); // Clear data on error
    } finally {
      setIsLoadingTree(false);
    }
  }, [treeId]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!treeId) return;
    setIsLoadingInvites(true);
    // setError(null); // Keep main error for tree fetch, or have separate error states
    try {
      const response = await fetch(`/api/family-trees/${treeId}/invitations?status=pending`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `Failed to fetch pending invitations. Status: ${response.status}`);
      }
      const data: Invitation[] = await response.json();
      setInvitations(data);
    } catch (err) {
      logger.error(`Error fetching pending invitations for tree ${treeId}:`, err);
      // setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching invitations.');
      // Potentially set a specific error for invites section
      setInvitations([]); // Clear data on error
    } finally {
      setIsLoadingInvites(false);
    }
  }, [treeId]);

  useEffect(() => {
    if (treeId) {
      fetchFamilyTreeDetails();
      fetchPendingInvitations();
    }
  }, [treeId, fetchFamilyTreeDetails, fetchPendingInvitations]);

  const handleDataRefresh = () => {
    // This function will be called by child components to trigger a refresh
    fetchFamilyTreeDetails(); // Refreshes collaborators list (part of tree details)
    fetchPendingInvitations(); // Refreshes pending invitations list
  };

  // Determine if current user can manage this tree (owner or admin collaborator)
  // This logic might be more complex if roles are fetched async or currentUser is not immediately available
  const canManageTree = currentUser && familyTree &&
                        (familyTree.ownerId === currentUser.id ||
                         familyTree.collaborators.some(c => c.userId === currentUser.id && c.role === 'admin' && c.acceptedAt));


  if (isLoadingTree) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="container mx-auto p-4"><div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded" role="alert">{error}</div></div>;
  }

  if (!familyTree) {
    return <div className="container mx-auto p-4 text-center text-gray-500">Family tree not found or you do not have permission to view it.</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Manage Collaborators</h1>
        <p className="text-xl text-gray-600">For Family Tree: <span className="font-semibold">{familyTree.name}</span></p>
      </header>

      {canManageTree ? (
        <>
          <section className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Invite New Collaborator</h2>
            <InviteCollaboratorForm treeId={treeId} onInvitationSent={handleDataRefresh} />
          </section>

          <section className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pending Invitations</h2>
            {isLoadingInvites ? <LoadingSpinner /> : (
              <PendingInvitationsList
                treeId={treeId}
                invitations={invitations}
                onInvitationRevoked={handleDataRefresh}
              />
            )}
          </section>

          <section className="p-6 bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Current Collaborators</h2>
            <CollaboratorsList
              treeId={treeId}
              collaborators={familyTree.collaborators}
              ownerId={familyTree.ownerId}
              onCollaboratorUpdated={handleDataRefresh}
            />
          </section>
        </>
      ) : (
        <div className="p-6 bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-lg">
          <p className="font-semibold">Permission Denied</p>
          <p>You do not have sufficient permissions to manage collaborators for this family tree. Only the owner or admin collaborators can manage settings.</p>
        </div>
      )}
    </div>
  );
};

export default ManageCollaboratorsPage;
