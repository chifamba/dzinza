import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAdminUsers, AdminUserListParams } from '../../hooks/useAdminUsers'; // Adjust path
import { AdminUserData } from '../../types/admin'; // Adjust path
// import { useAuth } from '../../hooks/useAuth'; // Assuming real hook
import { logger } from '@shared/utils/logger';

// --- Mock useAuth for this component's development ---
const useAuth = () => ({
  currentUser: { id: 'current-admin-user-id' }, // Example current admin user
});
// --- End Mock useAuth ---

// Dummy UI Components (replace with actual from src/components/ui if available)
const Input = ({ ...props }) => <input className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white" {...props} />;
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props}>{children}</select>;
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                ${props.disabled ? 'text-gray-400 bg-gray-200 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed' :
                  (props.variant === 'danger' ? 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                   (props.variant === 'success' ? 'text-white bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                    'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'))}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const LoadingSpinner = () => <div className="text-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div><p className="mt-2">Loading users...</p></div>;
// End Dummy UI Components


const AdminUserListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useAuth(); // For self-action prevention

  // Local state for filter inputs
  const [emailFilter, setEmailFilter] = useState(searchParams.get('email') || '');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');

  const listParams = useMemo<AdminUserListParams>(() => ({
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: parseInt(searchParams.get('limit') || '20', 10),
    email: searchParams.get('email') || undefined,
    role: searchParams.get('role') || undefined,
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
  }), [searchParams]);

  const { users, pagination, isLoading, error, fetchUsers, refreshUsers } = useAdminUsers(listParams);

  useEffect(() => {
    // The hook's internal useEffect handles fetching based on initialParams.
    // This effect ensures that if URL params change, we explicitly tell the hook to use them.
     fetchUsers(listParams);
  }, [listParams, fetchUsers]); // fetchUsers is from useCallback

  const handleFilterApply = () => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', '1'); // Reset to page 1 on filter change
    if (emailFilter) newParams.set('email', emailFilter); else newParams.delete('email');
    if (roleFilter) newParams.set('role', roleFilter); else newParams.delete('role');
    setSearchParams(newParams, { replace: true });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('page', '1');
    newParams.set(name, value);
    setSearchParams(newParams, { replace: true });
  };


  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('page', newPage.toString());
      setSearchParams(newParams);
    }
  };

  const handleToggleActive = async (user: AdminUserData) => {
    if (currentUser?.id === user._id) {
      alert("Administrators cannot change their own active status via this list.");
      return;
    }
    const action = user.isActive ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} user ${user.email}?`)) return;

    const endpoint = `/api/admin/users/${user._id}`;
    let method = 'PUT';
    let body: any = { isActive: !user.isActive };

    if (!user.isActive) { // Activating
        // No specific body change needed beyond isActive: true
    } else { // Deactivating
        method = 'DELETE'; // Use DELETE endpoint for deactivation
        body = undefined; // No body for DELETE
    }

    try {
      const response = await fetch(endpoint, {
        method: method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || `Failed to ${action} user.`);
      }
      alert(`User ${action}d successfully.`); // Replace with toast
      refreshUsers(); // Refetch the user list
    } catch (err) {
      logger.error(`Error ${action} user:`, err);
      alert(`Error: ${err instanceof Error ? err.message : 'Could not perform action.'}`); // Replace with toast
    }
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">User Management</h1>

      {/* Filters */}
      <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-md space-y-4 sm:flex sm:space-y-0 sm:space-x-4 items-end">
        <div>
          <label htmlFor="emailFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Email</label>
          <Input type="text" id="emailFilter" value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} placeholder="user@example.com" />
        </div>
        <div>
          <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Role</label>
          <Select id="roleFilter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </Select>
        </div>
        <Button onClick={handleFilterApply} className="w-full sm:w-auto">Apply Filters</Button>
      </div>

      {/* Sorting - Basic example, can be expanded */}
       <div className="p-4 bg-white dark:bg-gray-800 shadow rounded-md flex space-x-4 items-end">
           <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sort By</label>
                <Select id="sortBy" name="sortBy" value={listParams.sortBy} onChange={handleSortChange}>
                    <option value="createdAt">Joined Date</option>
                    <option value="email">Email</option>
                    <option value="lastName">Last Name</option>
                </Select>
           </div>
           <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Order</label>
                <Select id="sortOrder" name="sortOrder" value={listParams.sortOrder} onChange={handleSortChange}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                </Select>
           </div>
       </div>


      {isLoading && <LoadingSpinner />}
      {error && <div className="p-3 bg-red-100 text-red-700 border-red-300 rounded-md">{error}</div>}

      {!isLoading && !error && users.length === 0 && (
        <p className="text-gray-600 dark:text-gray-400 text-center py-4">No users found matching your criteria.</p>
      )}

      {!isLoading && !error && users.length > 0 && (
        <div className="shadow overflow-x-auto border-b border-gray-200 dark:border-gray-700 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Roles</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Joined</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {user.firstName || ''} {user.lastName || ''}
                    {!user.firstName && !user.lastName && '[No Name Provided]'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.roles.join(', ')}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${user.isActive ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <Link to={`/admin/users/edit/${user._id}`} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">Edit</Link>
                    {currentUser?.id !== user._id && (
                      <Button
                        onClick={() => handleToggleActive(user)}
                        variant={user.isActive ? "danger" : "success"}
                        size="small"
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && !isLoading && (
        <div className="py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <Button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
            Previous
          </Button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {pagination.page} of {pagination.totalPages} (Total: {pagination.totalItems} users)
          </span>
          <Button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminUserListPage;
