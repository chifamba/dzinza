import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FamilyTreeDetails, UserProfile } from '../../types/collaborators'; // Adjust path if necessary
import { logger } from '@shared/utils/logger';

// Mock authService for fetching owner profile - replace with actual service
const mockAuthService = {
  getUserProfile: async (userId: string): Promise<UserProfile | null> => {
    logger.info(`Mock authService.getUserProfile called for owner ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate delay
    if (userId === 'owner-id-placeholder-1') {
      return { id: userId, name: 'Alice Wonderland', email: 'alice@example.com' };
    }
    if (userId === 'current-user-id-placeholder') { // if current user is an owner of another tree
        return { id: userId, name: 'Current User (as Owner)', email: 'current@example.com'};
    }
    // Add more mock users if needed for testing
    return { id: userId, name: `Owner ${userId.substring(0,6)}`, email: `owner-${userId.substring(0,6)}@example.com` };
    // return null; // Simulate user not found
  },
};


interface FamilyTreeCardProps {
  tree: FamilyTreeDetails;
  currentUserId: string; // Current logged-in user's ID
}

const FamilyTreeCard: React.FC<FamilyTreeCardProps> = ({ tree, currentUserId }) => {
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [isLoadingOwner, setIsLoadingOwner] = useState<boolean>(false);

  const isOwnedByCurrentUser = tree.ownerId === currentUserId;
  // The 'role' property is assumed to be provided by the backend on the tree object
  // This virtual 'role' is calculated based on tree.ownerId and tree.collaborators vs tree._currentUserId
  const displayRole = isOwnedByCurrentUser ? 'Owner' : tree.role || 'N/A';


  useEffect(() => {
    if (!isOwnedByCurrentUser && tree.ownerId) {
      setIsLoadingOwner(true);
      mockAuthService.getUserProfile(tree.ownerId)
        .then(profile => {
          if (profile) {
            setOwnerName(profile.name || profile.email || profile.id);
          } else {
            setOwnerName('Unknown Owner');
          }
        })
        .catch(err => {
          logger.error(`Failed to fetch owner profile for ${tree.ownerId}`, err);
          setOwnerName('Error loading owner');
        })
        .finally(() => setIsLoadingOwner(false));
    }
  }, [tree.ownerId, isOwnedByCurrentUser]);

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden transition-all duration-300 hover:shadow-2xl flex flex-col h-full">
      <div className="p-6 flex-grow">
        <h3 className="text-xl font-semibold text-blue-700 mb-2">{tree.name}</h3>
        <p className="text-gray-600 text-sm mb-4 h-20 overflow-y-auto custom-scrollbar">
          {tree.description || 'No description available.'}
        </p>

        <div className="text-xs text-gray-500 space-y-1 mb-4">
          <p>
            <span className="font-medium">Your Role:</span>
            <span className={`ml-1 px-2 py-0.5 rounded-full text-white text-xs font-semibold
              ${displayRole === 'Owner' ? 'bg-green-500' : ''}
              ${displayRole === 'Admin' ? 'bg-sky-500' : ''}
              ${displayRole === 'Editor' ? 'bg-yellow-500 text-gray-800' : ''}
              ${displayRole === 'Viewer' ? 'bg-gray-400' : ''}
              ${displayRole === 'N/A' ? 'bg-red-400' : ''}
            `}>
              {displayRole}
            </span>
          </p>
          {!isOwnedByCurrentUser && (
            <p>
              <span className="font-medium">Shared by:</span> {isLoadingOwner ? 'Loading...' : ownerName || 'Unknown Owner'}
            </p>
          )}
           <p>
            <span className="font-medium">Privacy:</span> <span className="capitalize">{tree.privacy || 'N/A'}</span>
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <Link href={`/family-tree/${tree._id}`} legacyBehavior>
            <a className="block w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
              View Tree
            </a>
          </Link>
          <Link href={`/family-trees/${tree._id}/collaborators`} legacyBehavior>
            <a className="block w-full sm:w-auto text-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
              {isOwnedByCurrentUser || displayRole === 'Admin' ? 'Manage Collaborators' : 'View Collaborators'}
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FamilyTreeCard;

// Add simple scrollbar styling if needed for description
// <style jsx global>{`
//   .custom-scrollbar::-webkit-scrollbar {
//     width: 6px;
//   }
//   .custom-scrollbar::-webkit-scrollbar-track {
//     background: #f1f1f1;
//     border-radius: 10px;
//   }
//   .custom-scrollbar::-webkit-scrollbar-thumb {
//     background: #c7c7c7;
//     border-radius: 10px;
//   }
//   .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//     background: #a3a3a3;
//   }
// `}</style>
