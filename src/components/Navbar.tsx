import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  Menu, 
  X, 
  TreePine, 
  Home, 
  Search, 
  Camera,
  Dna,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LanguageSelector from './LanguageSelector';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { user, isAuthenticated, logout } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { path: '/dashboard', label: t('navigation.dashboard'), icon: Home },
    { path: '/family-tree', label: t('navigation.familyTree'), icon: TreePine },
    { path: '/dna-matching', label: t('navigation.dnaMatching'), icon: Dna },
    { path: '/records', label: t('navigation.records'), icon: Search },
    { path: '/photos', label: t('navigation.photos'), icon: Camera },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      setShowUserMenu(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.8 }}
                className="text-dzinza-600"
              >
                <TreePine className="h-8 w-8" />
              </motion.div>
              <span className="text-2xl font-bold text-dzinza-600 font-display">
                Dzinza
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {isAuthenticated && navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
                    isActive
                      ? 'text-dzinza-600 bg-dzinza-50'
                      : 'text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              
              {isAuthenticated ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50 transition-colors duration-300"
                  >
                    <User className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {user?.firstName || user?.email}
                    </span>
                  </button>
                  
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200"
                    >
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        {t('navigation.profile')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('navigation.signOut')}
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleLogin}
                    className="text-gray-600 hover:text-dzinza-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300"
                  >
                    {t('navigation.signIn')}
                  </button>
                  <Link
                    to="/register"
                    className="bg-dzinza-600 text-white px-4 py-2 rounded-md hover:bg-dzinza-700 transition-colors duration-300 text-sm font-medium"
                  >
                    {t('navigation.signUp')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-dzinza-600 transition-colors duration-300"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: isOpen ? 1 : 0, 
          height: isOpen ? 'auto' : 0 
        }}
        transition={{ duration: 0.3 }}
        className="md:hidden bg-white border-t border-gray-200 overflow-hidden"
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {isAuthenticated && navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors duration-300 ${
                  isActive
                    ? 'text-dzinza-600 bg-dzinza-50'
                    : 'text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-4 border-t border-gray-200">
            <div className="mb-3">
              <LanguageSelector className="w-full" />
            </div>
            
            {isAuthenticated ? (
              <div className="space-y-2">
                {user && (
                  <div className="px-3 py-2 text-sm text-gray-600">
                    Welcome, {user.firstName || user.email}
                  </div>
                )}
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center w-full px-3 py-2 rounded-md text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50 transition-colors duration-300"
                >
                  <User className="h-5 w-5 mr-2" />
                  {t('navigation.profile')}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 rounded-md text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50 transition-colors duration-300"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {t('navigation.signOut')}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    handleLogin();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-gray-600 hover:text-dzinza-600 hover:bg-dzinza-50 transition-colors duration-300"
                >
                  {t('navigation.signIn')}
                </button>
                <Link
                  to="/register"
                  onClick={() => setIsOpen(false)}
                  className="block w-full bg-dzinza-600 text-white px-4 py-2 rounded-md hover:bg-dzinza-700 transition-colors duration-300 text-center"
                >
                  {t('navigation.signUp')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;