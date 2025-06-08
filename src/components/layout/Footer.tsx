import React from 'react';

interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();
  return (
    <footer
      className={`
        bg-gray-100 border-t border-gray-200 py-8 text-center
        ${className}
      `}
    >
      <div className="container mx-auto text-sm text-gray-600">
        <p>&copy; {currentYear} Dzinza. All rights reserved.</p>
        <div className="mt-2 space-x-4">
          <a href="/privacy-policy" className="hover:text-blue-600">Privacy Policy</a>
          <a href="/terms-of-service" className="hover:text-blue-600">Terms of Service</a>
          <a href="/contact" className="hover:text-blue-600">Contact Us</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
