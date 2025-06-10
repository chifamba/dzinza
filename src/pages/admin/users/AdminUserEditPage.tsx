import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminUserData } from '../../../types/admin'; // Adjust path
// import { useAuth } from '../../../hooks/useAuth'; // Assuming real hook
import { logger } from '@shared/utils/logger';

// --- Mock useAuth for this component's development ---
const useAuth = () => ({
  currentUser: { id: 'current-admin-user-id' }, // Example: current user is an admin
  // currentUser: { id: 'editing-self-user-id' }, // Example: current user is the one being edited
});
// --- End Mock useAuth ---

// Dummy UI Components (replace with actual from src/components/ui if available)
const Input = ({label, ...props}: React.InputHTMLAttributes<HTMLInputElement> & {label?: string}) => (
    <div>
        {label && <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <input className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white disabled:bg-gray-200 dark:disabled:bg-gray-600" {...props} />
    </div>
);
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'text-gray-400 bg-gray-300 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-gray-400' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const Checkbox = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) => (
    <label className="flex items-center space-x-2">
        <input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:focus:ring-offset-gray-800 disabled:opacity-50" {...props} />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
);
const LoadingSpinner = ({text = "Loading..."}) => <div className="text-center p-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div><p className="mt-2">{text}</p></div>;
// End Dummy UI Components

const ALL_ROLES = ['user', 'admin', 'moderator']; // Available roles in the system

const AdminUserEditPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [userData, setUserData] = useState<AdminUserData | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['user']);

  const [isLoading, setIsLoading] = useState(true); // For initial data fetch
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditingSelf = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) {
      setError("User ID is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    fetch(`/api/admin/users/${userId}`) // Auth token handled by global fetch wrapper
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Failed to fetch user data. Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data: AdminUserData) => {
        setUserData(data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setIsActive(data.isActive);
        setSelectedRoles(data.roles || ['user']);
        setError(null);
      })
      .catch(err => {
        logger.error(`Error fetching user ${userId}:`, err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setUserData(null);
      })
      .finally(() => setIsLoading(false));
  }, [userId]);

  const handleRoleChange = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      firstName,
      lastName,
      isActive,
      roles: selectedRoles,
    };

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.errors?.[0]?.msg || 'Failed to update user.');
      }
      setSuccessMessage('User updated successfully!');
      setUserData(responseData); // Update local state with response from API
      // Optionally navigate back or refresh data differently
      // navigate('/admin/users');
    } catch (err) {
      logger.error(`Error updating user ${userId}:`, err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during update.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading user data..." />;
  if (error && !userData) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>; // Show error if initial fetch failed
  if (!userData) return <div className="p-4 text-center">User not found or could not be loaded.</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-xl rounded-lg">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-white mb-6 border-b dark:border-gray-700 pb-3">
        Edit User: {userData.firstName || ''} {userData.lastName || ''} ({userData.email})
      </h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">{successMessage}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input label="First Name" id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Last Name" id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />

        <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email (Read-only)</span>
            <p className="text-sm p-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400">{userData.email}</p>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roles</span>
          <div className="space-y-2">
            {ALL_ROLES.map(role => {
              const isCurrentRoleAdmin = selectedRoles.includes('admin');
              // Disable 'admin' checkbox if user is editing self AND their current role is 'admin'
              const disableAdminRoleSelfEdit = isEditingSelf && role === 'admin' && isCurrentRoleAdmin;
              return (
                <Checkbox
                  key={role}
                  id={`role-${role}`}
                  label={role.charAt(0).toUpperCase() + role.slice(1)}
                  checked={selectedRoles.includes(role)}
                  onChange={() => handleRoleChange(role)}
                  disabled={disableAdminRoleSelfEdit || isSubmitting}
                />
              );
            })}
             {isEditingSelf && selectedRoles.includes('admin') && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You cannot remove your own Admin role.</p>
             )}
          </div>
        </div>

        <div>
            <Checkbox
                id="isActive"
                label="User is Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={isEditingSelf && isActive || isSubmitting} // Prevent admin deactivating self if currently active
            />
            {isEditingSelf && userData.isActive && (
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">You cannot deactivate your own account.</p>
            )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin/users')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminUserEditPage;
