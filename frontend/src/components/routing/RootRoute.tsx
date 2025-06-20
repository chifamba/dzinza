import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";
import { LandingPage } from "../../pages";

/**
 * Smart root route component that redirects based on authentication status
 * - Authenticated users: redirect to family tree canvas
 * - Unauthenticated users: show landing page
 */
const RootRoute: React.FC = () => {
  const { isAuthenticated, status } = useSelector(
    (state: RootState) => state.auth
  );

  // Show loading while checking authentication status
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // If authenticated, redirect to family tree canvas
  if (isAuthenticated) {
    return <Navigate to="/family-tree" replace />;
  }

  // If not authenticated, show landing page
  return <LandingPage />;
};

export default RootRoute;
