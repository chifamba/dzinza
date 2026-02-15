import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Login } from './Login';
import { Register } from './Register';
import { FamilyTree } from './FamilyTree';
import { Dashboard } from './Dashboard';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import PersonDetail from './pages/PersonDetail';
import AdminDashboard from './pages/AdminDashboard';

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/dashboard" element={
        <RequireAuth>
          <Dashboard />
        </RequireAuth>
      } />
      
      <Route path="/trees/:id" element={
        <RequireAuth>
          <FamilyTree />
        </RequireAuth>
      } />

      <Route path="/search" element={
        <RequireAuth>
          <Search />
        </RequireAuth>
      } />

      <Route path="/persons/:id" element={
        <RequireAuth>
          <PersonDetail />
        </RequireAuth>
      } />

      <Route path="/notifications" element={
        <RequireAuth>
          <Notifications />
        </RequireAuth>
      } />

      <Route path="/admin" element={
        <RequireAuth>
          <AdminDashboard />
        </RequireAuth>
      } />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

// Wrapper to handle onLogin callback for existing component
function LoginWrapper() {
  const [shouldRedirect, setShouldRedirect] = React.useState(false);

  if (shouldRedirect || localStorage.getItem('token')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login onLogin={() => setShouldRedirect(true)} />;
}

export default App;
