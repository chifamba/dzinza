import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
// Ensure FamilyTreePage is imported
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  FamilyTreePage, // Import FamilyTreePage
  OAuthCallbackPage, // Import OAuthCallbackPage
} from "./pages";
import AvatarTestPage from "./pages/AvatarTestPage"; // Import avatar test page
import { ProtectedRoute } from "./components/auth"; // Adjust path as needed
import { RootRoute } from "./components/routing"; // Import smart root route

function App() {
  return (
    <Router>
      <Routes>
        {/* Smart root route - shows landing page for unauthenticated, redirects to family tree for authenticated */}
        <Route path="/" element={<RootRoute />} />

        {/* Public Routes */}
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/avatar-test-public" element={<AvatarTestPage />} />
        <Route
          path="/auth/oauth/callback/:provider"
          element={<OAuthCallbackPage />}
        />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Legacy dashboard route redirects to family tree canvas */}
          <Route
            path="/dashboard"
            element={<Navigate to="/family-tree" replace />}
          />
          {/* Main family tree canvas */}
          <Route path="/family-tree" element={<FamilyTreePage />} />
          {/* Avatar test page */}
          <Route path="/avatar-test" element={<AvatarTestPage />} />
          {/* App route also redirects to family-tree for consistency */}
          <Route path="/app" element={<Navigate to="/family-tree" replace />} />
          {/* Add other protected routes here */}
        </Route>

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
