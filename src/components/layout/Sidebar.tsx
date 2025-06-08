import React from 'react';

interface SidebarProps {
  navItems: Array<{ label: string; path: string; icon?: React.ReactNode }>;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ navItems, className = '' }) => {
  return (
    <aside
      className={`
        w-64 bg-gray-50 p-4 border-r border-gray-200
        ${className}
      `}
    >
      <nav>
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-2">
              <a
                href={item.path} // Should be <Link> if using react-router
                className="flex items-center p-2 text-gray-700 hover:bg-gray-200 hover:text-blue-600 rounded-md transition-colors duration-150"
              >
                {item.icon && <span className="mr-3">{item.icon}</span>}
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
