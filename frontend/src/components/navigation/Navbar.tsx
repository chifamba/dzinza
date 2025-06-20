import React, { useState } from "react";
import { Link } from "react-router-dom"; // Assuming react-router-dom is used for navigation
import { useSelector } from "react-redux";
import NotificationIndicator from "../notifications/NotificationIndicator";
import GlobalSearchBar from "../search/GlobalSearchBar"; // Import GlobalSearchBar
import LoginModal from "../auth/LoginModal";
import { Button } from "../ui";
import { RootState } from "../../store/store";

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

const Navbar: React.FC<NavbarProps> = ({ logo, navItems, className = "" }) => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleLoginClick = () => {
    setIsLoginModalOpen(true);
  };

  const handleCloseLoginModal = () => {
    setIsLoginModalOpen(false);
  };
  return (
    <nav
      className={`
        bg-white shadow-md py-3 px-4 md:px-6
        ${className}
      `}
    >
      <div className="container mx-auto flex items-center justify-between gap-x-2 sm:gap-x-4">
        {/* Left Group: Logo and Nav Items */}
        <div className="flex items-center flex-shrink-0">
          {logo && <div className="flex-shrink-0 mr-2 sm:mr-4">{logo}</div>}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150"
              >
                {item.icon && (
                  <span className="mr-1 sm:mr-1.5">{item.icon}</span>
                )}
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Center: Global Search Bar - more prominent on desktop */}
        <div className="flex-grow hidden sm:flex justify-center px-2 sm:px-4">
          <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl">
            {" "}
            {/* Control max width of search bar */}
            <GlobalSearchBar />
          </div>
        </div>

        {/* Right side items & Mobile Menu Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="hidden sm:flex items-center space-x-3">
            {" "}
            {/* Icons visible on sm+ */}
            <NotificationIndicator />
            {/* Login Button - only show if not authenticated */}
            {!isAuthenticated && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleLoginClick}
                className="px-4 py-2"
              >
                Login
              </Button>
            )}
            {/* Placeholder for User Menu when authenticated */}
            {/* {isAuthenticated && <UserMenu />} */}
          </div>

          {/* Mobile: Search might be an icon that expands, or nav items move to menu */}
          <div className="sm:hidden flex items-center space-x-2">
            {" "}
            {/* Mobile specific utilities / search toggle area */}
            {/* On mobile, perhaps only show NotificationIndicator, search could be an icon toggle */}
            <NotificationIndicator />
            {/* Mobile Login Button */}
            {!isAuthenticated && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleLoginClick}
                className="px-3 py-1 text-xs"
              >
                Login
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            {" "}
            {/* This button itself is hidden on medium+ screens */}
            <button
              type="button"
              className="text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-label="Open main menu"
            >
              {/* Heroicon name: menu */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </nav>
  );
};

export default Navbar;
