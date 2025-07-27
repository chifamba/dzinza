import React, { useState, useEffect } from "react";
import FamilyTreeCard from "../../components/family-trees/FamilyTreeCard"; // Adjust path if necessary
import { FamilyTreeDetails, UserProfile } from "../../types/collaborators"; // Adjust path if necessary
import { logger } from "@shared/utils/logger";
// import { useAuth } from '../../hooks/useAuth'; // Assuming a real useAuth hook

// --- Mock useAuth for standalone page development ---
const useAuth = () => {
  // In a real app, currentUser might be null initially while loading
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching current user
    setTimeout(() => {
      setCurrentUser({
        id: "current-user-id-placeholder",
        name: "Demo User",
        email: "user@example.com",
      });
      setAuthLoading(false);
    }, 500);
  }, []);

  return { currentUser, isLoading: authLoading };
};
// --- End Mock ---

// Dummy Loading component
const LoadingSpinner = ({ text = "Loading..." }: { text?: string }) => (
  <div className="text-center p-10">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
    <p className="mt-4 text-lg text-gray-600">{text}</p>
  </div>
);

const MyTreesListingPage: React.FC = () => {
  const { currentUser, isLoading: isAuthLoading } = useAuth();
  const [trees, setTrees] = useState<FamilyTreeDetails[]>([]);
  const [isLoadingTrees, setIsLoadingTrees] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return; // Don't fetch if user isn't loaded/logged in

    const fetchTrees = async () => {
      setIsLoadingTrees(true);
      setError(null);
      try {
        const response = await fetch("/api/family-trees"); // Auth token should be handled by a global fetch wrapper
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              errorData.error ||
              "Failed to fetch family trees."
          );
        }
        const data = await response.json(); // Expects { trees: FamilyTreeDetails[], pagination: {...} }
        setTrees(data.trees || []); // Assuming the API returns { trees: [...] }
      } catch (err) {
        logger.error("Error fetching family trees:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred."
        );
        setTrees([]);
      } finally {
        setIsLoadingTrees(false);
      }
    };

    fetchTrees();
  }, [currentUser]); // Refetch if currentUser changes (e.g., login/logout)

  if (isAuthLoading) {
    return <LoadingSpinner text="Authenticating..." />;
  }

  if (!currentUser) {
    // This case might be handled by a global redirect to login if auth is more deeply integrated
    return (
      <div className="container mx-auto p-6 text-center text-red-500">
        Please log in to view your family trees.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-800 sm:text-5xl">
            My Family Trees
          </h1>
          <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
            Here are all the family trees you own or are collaborating on.
          </p>
        </header>

        {isLoadingTrees && <LoadingSpinner text="Loading your trees..." />}

        {error && (
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-2xl mx-auto"
            role="alert"
          >
            <p className="font-bold">Error Loading Trees</p>
            <p>{error}</p>
          </div>
        )}

        {!isLoadingTrees && !error && trees.length === 0 && (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 12h3m-3 3h3m-3-6h3m2 6V7.5a2.5 2.5 0 00-2.5-2.5h-9A2.5 2.5 0 005 7.5V15"
              />
            </svg>
            <h3 className="mt-4 text-xl font-semibold text-gray-700">
              No Family Trees Found
            </h3>
            <p className="mt-2 text-md text-gray-500">
              You haven't created any family trees yet, or none have been shared
              with you.
            </p>
            <div className="mt-6">
              <button
                type="button"
                className="px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 font-medium"
                onClick={async () => {
                  try {
                    // Default values for quick create
                    const newTree = await import(
                      "../../services/api/genealogyService"
                    ).then((mod) =>
                      mod.genealogyService.createFamilyTree({
                        name: "My First Family Tree",
                        description: "Created from quick-create button.",
                        privacy: "private",
                      })
                    );
                    // Refetch trees after creation
                    const result = await import(
                      "../../services/api/genealogyService"
                    ).then((mod) => mod.genealogyService.listFamilyTrees());
                    setTrees(result.trees || []);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to create tree."
                    );
                  }
                }}
              >
                Create Your First Family Tree
              </button>
            </div>
          </div>
        )}

        {!isLoadingTrees && !error && trees.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trees.map((tree) => (
              <FamilyTreeCard
                key={tree._id}
                tree={tree}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTreesListingPage;
