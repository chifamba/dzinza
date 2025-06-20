import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Ensure FamilyTreePage is imported
import {
  LandingPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  DashboardPage,
  FamilyTreePage, // Import FamilyTreePage
  OAuthCallbackPage // Import OAuthCallbackPage
} from './pages';
import { ProtectedRoute } from './components/auth'; // Adjust path as needed

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/auth/oauth/callback/:provider" element={<OAuthCallbackPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Default protected route redirects to family tree canvas */}
          <Route path="/dashboard" element={<Navigate to="/family-tree" replace />} />
          <Route path="/family-tree" element={<FamilyTreePage />} />
          {/* Add a root protected route that also redirects to family-tree */}
          <Route path="/app" element={<Navigate to="/family-tree" replace />} />
          {/* Add other protected routes here */}
        </Route>

        {/* Fallback for unknown routes (optional) */}
        <Route path="*" element={<Navigate to="/" replace />} />
        {/* Or a dedicated <NotFoundPage /> component */}
      </Routes>
    </Router>
  );
}

export default App;