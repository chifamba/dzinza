import React, { useState } from 'react';
// Assuming Button, Input, Select are available from ui components
// import { Button } from '../ui/Button';
// import { Input } from '../ui/Input';
// import { Select } from '../ui/Select';
import { logger } from '@shared/utils/logger';

// Dummy UI components if not available
const Input = ({ ...props }) => <input className="border border-gray-300 rounded px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" {...props} />;
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string}) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="border border-gray-300 rounded px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" {...props}>{children}</select>;


interface InviteCollaboratorFormProps {
  treeId: string;
  onInvitationSent: () => void;
}

const InviteCollaboratorForm: React.FC<InviteCollaboratorFormProps> = ({ treeId, onInvitationSent }) => {
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'viewer' | 'editor'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Email is required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/family-trees/${treeId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header with token would be handled by a global fetch wrapper or context
        },
        body: JSON.stringify({ email, permissionLevel }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.errors?.[0]?.msg || 'Failed to send invitation.');
      }

      setSuccessMessage(`Invitation sent successfully to ${email}.`);
      setEmail(''); // Reset email
      setPermissionLevel('viewer'); // Reset permission level
      onInvitationSent(); // Notify parent to refetch data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error('Error sending invitation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg shadow">
      {error && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{error}</div>}
      {successMessage && <div className="p-3 bg-green-100 text-green-700 border border-green-300 rounded-md">{successMessage}</div>}

      <div>
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
          Invitee Email:
        </label>
        <Input
          type="email"
          id="invite-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email address"
          required
          disabled={isLoading}
        />
      </div>
      <div>
        <label htmlFor="permission-level" className="block text-sm font-medium text-gray-700 mb-1">
          Permission Level:
        </label>
        <Select
          id="permission-level"
          value={permissionLevel}
          onChange={(e) => setPermissionLevel(e.target.value as 'viewer' | 'editor')}
          disabled={isLoading}
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </Select>
      </div>
      <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? 'Sending...' : 'Send Invitation'}
      </Button>
    </form>
  );
};

export default InviteCollaboratorForm;
