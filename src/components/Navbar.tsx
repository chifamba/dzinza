import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Menu, 
  X, 
  TreePine, 
  Home, 
  Users, 
  Search, 
  Camera,
  Dna
} from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/family-tree', label: 'Family Tree', icon: TreePine },
    { path: '/dna-matching', label: 'DNA Matching', icon: Dna },
    { path: '/records', label: 'Records', icon: Search },
    { path: '/photos', label: 'Photos', icon: Camera },
  ];

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
            {navItems.map((item) => {
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
              <button className="bg-dzinza-600 text-white px-4 py-2 rounded-md hover:bg-dzinza-700 transition-colors duration-300">
                Sign In
              </button>
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
          {navItems.map((item) => {
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
            <button className="w-full bg-dzinza-600 text-white px-4 py-2 rounded-md hover:bg-dzinza-700 transition-colors duration-300">
              Sign In
            </button>
          </div>
        </div>
      </motion.div>
    </nav>
  );
};

export default Navbar;