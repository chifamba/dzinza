import React, { useState } from 'react';
import { Invitation } from '../../types/collaborators'; // Using the shared type
// import { Button } from '../ui/Button';
import { logger } from '@shared/utils/logger';

// Dummy UI components if not available
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?:string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-400 cursor-not-allowed' :
                  (props.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);


interface PendingInvitationsListProps {
  treeId: string;
  invitations: Invitation[];
  onInvitationRevoked: () => void;
  // currentUserId: string; // Needed if only specific users (e.g. inviter) can revoke, or if handled by API policy
  // ownerId: string; // Needed if owner has special revoke privileges beyond admin
}

const PendingInvitationsList: React.FC<PendingInvitationsListProps> = ({
  treeId,
  invitations,
  onInvitationRevoked
}) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

  const handleRevoke = async (invitationId: string) => {
    setLoadingStates(prev => ({ ...prev, [invitationId]: true }));
    setErrorStates(prev => ({ ...prev, [invitationId]: null }));

    try {
      const response = await fetch(`/api/family-trees/${treeId}/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          // Authorization header with token would be handled by a global fetch wrapper or context
        },
      });

      if (!response.ok) {
        const responseData = await response.json().catch(() => ({ message: 'Failed to revoke invitation.' }));
        throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
      }

      // Success
      onInvitationRevoked(); // Notify parent to refetch
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setErrorStates(prev => ({ ...prev, [invitationId]: errorMessage }));
      logger.error(`Error revoking invitation ${invitationId}:`, err);
    } finally {
      setLoadingStates(prev => ({ ...prev, [invitationId]: false }));
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (_e) { return dateString; } // Renamed e to _e
  };


  if (invitations.length === 0) {
    return <p className="text-sm text-gray-500">No pending invitations.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires At</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {invitations.map((invite) => (
            <tr key={invite._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{invite.inviteeEmail}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 capitalize">{invite.permissionLevel}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(invite.createdAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(invite.expiresAt)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                <Button
                  onClick={() => handleRevoke(invite._id)}
                  disabled={loadingStates[invite._id]}
                  variant="danger"
                  size="small"
                  className="w-full sm:w-auto"
                >
                  {loadingStates[invite._id] ? 'Revoking...' : 'Revoke'}
                </Button>
                {errorStates[invite._id] && <p className="text-xs text-red-500 mt-1">{errorStates[invite._id]}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PendingInvitationsList;
