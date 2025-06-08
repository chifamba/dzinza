import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '../../store/store'; // Adjust path as needed

interface ProtectedRouteProps {
  // No specific props needed if just using Outlet for children
  // children?: React.ReactNode; // If you prefer to pass children explicitly
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { isAuthenticated, status } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Optional: Handle loading state if you have an initial auth check
  if (status === 'loading') {
    // You might want to return a loading spinner here
    // For now, we'll let it potentially show the login page briefly
    // or rely on initial state of isAuthenticated being false.
    return <div>Loading authentication status...</div>; // Or a proper spinner component
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />; // Outlet will render the matched child route element
  // Or if using explicit children: return <>{children}</>;
};

export default ProtectedRoute;
