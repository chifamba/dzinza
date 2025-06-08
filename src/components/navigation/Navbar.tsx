import React from 'react';
import { Link } from 'react-router-dom'; // Assuming react-router-dom is used for navigation

interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode; // Optional icon
}

interface NavbarProps {
  logo?: React.ReactNode;
  navItems: NavItem[];
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  logo,
  navItems,
  className = '',
}) => {
  return (
    <nav
      className={`
        bg-white shadow-md py-3 px-4 md:px-6
        ${className}
      `}
    >
      <div className="container mx-auto flex items-center justify-between">
        {logo && <div className="flex-shrink-0">{logo}</div>}

        <div className="hidden md:flex space-x-4 lg:space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button (functionality to be added later) */}
        <div className="md:hidden">
          <button
            type="button"
            className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-label="Open main menu"
          >
            {/* Heroicon name: menu */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
