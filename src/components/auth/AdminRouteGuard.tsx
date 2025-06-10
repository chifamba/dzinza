import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// Assume useAuth hook provides currentUser and isLoadingAuth
// For this subtask, we'll define a mock version directly in the file.
// In a real app, this would be imported: import { useAuth } from '../../hooks/useAuth';

interface MockUser {
  id: string;
  name?: string;
  email?: string;
  roles: string[];
}

interface UseAuthReturn {
  currentUser: MockUser | null;
  isLoadingAuth: boolean;
  // Add other auth properties if needed by the actual hook
}

// --- Mock useAuth for this component's development ---
const useAuth = (): UseAuthReturn => {
  // Simulate different states for testing:
  // 1. Loading state:
  // return { currentUser: null, isLoadingAuth: true };
  // 2. Not authenticated:
  // return { currentUser: null, isLoadingAuth: false };
  // 3. Authenticated as non-admin:
  // return { currentUser: { id: 'user123', roles: ['user'], name: 'Test User' }, isLoadingAuth: false };
  // 4. Authenticated as admin:
  return { currentUser: { id: 'admin456', roles: ['user', 'admin'], name: 'Admin User' }, isLoadingAuth: false };
};
// --- End Mock useAuth ---


const LoadingPlaceholder: React.FC = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    <p className="ml-4 text-lg text-gray-600">Checking authentication...</p>
  </div>
);

const AdminRouteGuard: React.FC = () => {
  const { currentUser, isLoadingAuth } = useAuth(); // Using the mock for now
  const location = useLocation();

  if (isLoadingAuth) {
    return <LoadingPlaceholder />;
  }

  if (!currentUser) {
    // User not authenticated, redirect to login page
    // Pass the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser.roles || !currentUser.roles.includes('admin')) {
    // User is authenticated but not an admin
    // Redirect to a general dashboard or a 'forbidden' page
    // For this task, redirecting to a general '/dashboard' (non-admin)
    // Or, if you have a specific forbidden page: return <Navigate to="/forbidden" replace />;
    // If redirecting, consider showing a message via toast or state passed to the target route.
    alert('Access Forbidden: You do not have administrator privileges.'); // Simple alert for now
    return <Navigate to="/dashboard" replace />; // Assuming a general user dashboard exists
  }

  // User is authenticated and is an admin, render the nested admin routes
  return <Outlet />;
};

export default AdminRouteGuard;
