import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import FamilyTree from './pages/FamilyTree';
import DNAMatching from './pages/DNAMatching';
import HistoricalRecords from './pages/HistoricalRecords';
import PhotoEnhancement from './pages/PhotoEnhancement';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { initializeLanguage } from './i18n/utils/languagePersistence';
import './i18n';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    initializeLanguage(i18n);
  }, [i18n]);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-body">
          <Navbar />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              
              {/* Authentication Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              {/* Protected Routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/family-tree" 
                element={
                  <ProtectedRoute>
                    <FamilyTree />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dna-matching" 
                element={
                  <ProtectedRoute>
                    <DNAMatching />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/records" 
                element={
                  <ProtectedRoute>
                    <HistoricalRecords />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/photos" 
                element={
                  <ProtectedRoute>
                    <PhotoEnhancement />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </AnimatePresence>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;