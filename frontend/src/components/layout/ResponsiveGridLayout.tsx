import React from 'react';

interface ResponsiveGridLayoutProps {
  children: React.ReactNode;
  className?: string;
  // More props can be added later for column counts, breakpoints, etc.
}

const ResponsiveGridLayout: React.FC<ResponsiveGridLayoutProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`
        grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default ResponsiveGridLayout;
