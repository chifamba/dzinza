import React from "react";
import Navbar from "../navigation/Navbar"; // Assuming Navbar is in ../navigation
import { Link } from "react-router-dom";

// Define a simple logo component for example purposes
const Logo: React.FC = () => (
  <Link
    to="/"
    className="text-2xl font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
  >
    Dzinza
  </Link>
);

// Define sample navigation items
const navItems = [
  { label: "Home", path: "/" },
  { label: "Family Tree", path: "/family-tree" },
  { label: "DNA Matches", path: "/dna-matches" },
  { label: "Research", path: "/research" },
];

interface HeaderProps {
  className?: string;
}

const Header: React.FC<HeaderProps> = ({ className = "" }) => {
  return (
    <header
      className={`w-full bg-white dark:bg-gray-900 sticky top-0 z-40 transition-colors duration-200 ${className}`}
    >
      <Navbar logo={<Logo />} navItems={navItems} />
    </header>
  );
};

export default Header;
