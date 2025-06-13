import React from 'react';
import { Header, Footer } from '../components/layout'; // Adjust path as needed
import { Button } from '../components/ui'; // Adjust path as needed
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    // In a real app, you might call authService.logout() as well
    // await authService.logout();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Welcome to your Dashboard{user ? `, ${user.name}!` : '!'}
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            This is a protected area. Only authenticated users can see this.
          </p>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DashboardPage;
