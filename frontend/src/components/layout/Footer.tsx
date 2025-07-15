import React from "react";
import { Link } from "react-router-dom";

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = "" }) => {
  const currentYear = new Date().getFullYear();
  return (
    <footer
      className={`
        bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 text-center transition-colors duration-200
        ${className}
      `}
    >
      <div className="container mx-auto text-sm text-gray-600 dark:text-gray-400 transition-colors duration-200">
        <p>&copy; {currentYear} Dzinza. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <Link
            to="/privacy-policy"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            Terms of Service
          </Link>
          <Link
            to="/contact"
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
