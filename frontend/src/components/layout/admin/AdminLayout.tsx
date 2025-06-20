import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Settings as SettingsIcon, Activity as SystemHealthIcon, ShieldAlert as ModerationIcon } from 'lucide-react'; // Added ModerationIcon

const adminNavItems = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'User Management', path: '/admin/users', icon: <Users size={18} /> },
  { label: 'Content Moderation', path: '/admin/moderation/flags', icon: <ModerationIcon size={18} /> },
  { label: 'System Health', path: '/admin/system-health', icon: <SystemHealthIcon size={18} /> },
  { label: 'Site Settings', path: '/admin/settings', icon: <SettingsIcon size={18} /> },
];

const AdminLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gray-800 dark:bg-gray-900 text-gray-100 p-4 space-y-6 shadow-lg">
        <div>
          <h2 className="text-xl font-semibold text-white text-center mb-6 border-b border-gray-700 pb-3">
            Admin Panel
          </h2>
          <nav className="space-y-1">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end // Important for NavLink to match exact paths for active state, esp. for parent routes
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                   hover:bg-gray-700 dark:hover:bg-gray-700/60 hover:text-white
                   ${isActive
                     ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                     : 'text-gray-300 dark:text-gray-400'}`
                }
              >
                {item.icon && <span className="opacity-80">{item.icon}</span>}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        {/* Optional: Add a footer or user info in sidebar */}
        {/* <div className="mt-auto"> ... </div> */}
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 overflow-auto">
        {/* Optional: Header within main content area */}
        {/* <header className="mb-6">
             <h1 className="text-2xl font-semibold text-gray-700">Page Title</h1>
           </header>
        */}
        <Outlet /> {/* Nested admin page content will render here */}
      </main>
    </div>
  );
};

export default AdminLayout;
