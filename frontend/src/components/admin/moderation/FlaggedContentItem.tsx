import React, { useState } from 'react';
import { FlaggedContentData, ResolutionAction, FlagResolutionPayload } from '../../../types/moderation'; // Adjust path
import { logger } from '@shared/utils/logger';
import { Link } from 'react-router-dom'; // For linking to content

// Dummy UI Components
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}) => (
  <button
    className={`px-3 py-1.5 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                ${props.disabled ? 'text-gray-400 bg-gray-200 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed' :
                  (props.variant === 'secondary' ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-400' :
                   'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.size === 'small' ? 'text-xs px-2 py-1' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:text-white" {...props}>{children}</select>;
const Textarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white" rows={3} {...props}></textarea>;
// End Dummy UI Components

interface FlaggedContentItemProps {
  flag: FlaggedContentData;
  onResolveSuccess: (updatedFlag: FlaggedContentData) => void; // Pass back updated flag
}

const resolutionOptions: { value: ResolutionAction; label: string }[] = [
  { value: 'dismiss', label: 'Dismiss (No Action)' },
  { value: 'hide_content', label: 'Hide Content' },
  { value: 'delete_content', label: 'Delete Content' },
];

const FlaggedContentItem: React.FC<FlaggedContentItemProps> = ({ flag, onResolveSuccess }) => {
  const [resolutionAction, setResolutionAction] = useState<ResolutionAction>('dismiss');
  const [moderatorNotes, setModeratorNotes] = useState(flag.moderatorNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload: FlagResolutionPayload = {
      resolutionAction,
      moderatorNotes: moderatorNotes.trim() || undefined,
    };

    try {
      const response = await fetch(`/api/admin/flags/${flag._id}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
        body: JSON.stringify(payload),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.errors?.[0]?.msg || 'Failed to resolve flag.');
      }
      onResolveSuccess(responseData); // Pass updated flag to parent
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error(`Error resolving flag ${flag._id}:`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resourcePath = flag.resourceType.toLowerCase() === 'event' ? 'events' :
                       flag.resourceType.toLowerCase() === 'comment' ? 'comments' : '#';
  // For comments, the link might be more complex, e.g., to the event containing the comment
  const viewContentLink = resourcePath === 'comments'
    ? `/admin/view-content/${flag.resourceType}/${flag.resourceId}` // Generic viewer for comment
    : `/${resourcePath}/${flag.resourceId}`; // Link to event/story view page


  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 my-3 border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Flag Details */}
        <div className="md:col-span-1 space-y-1 text-sm">
          <p><strong>Flag ID:</strong> <span className="text-gray-600 dark:text-gray-400">{flag._id}</span></p>
          <p><strong>Resource:</strong> <span className="text-gray-600 dark:text-gray-400">{flag.resourceType} - {flag.resourceId}</span></p>
          <p><Link to={viewContentLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Content (placeholder)</Link></p>
          <p><strong>Reason:</strong> <span className="text-red-500 dark:text-red-400 capitalize">{flag.reason.replace('_', ' ')}</span></p>
          {flag.reason === 'other' && flag.customReason && <p><strong>Details:</strong> <span className="text-gray-600 dark:text-gray-400">{flag.customReason}</span></p>}
          <p><strong>Reported By:</strong> <span className="text-gray-600 dark:text-gray-400">{flag.reportedByUserId}</span></p> {/* TODO: Fetch/display reporter name */}
          <p><strong>Date:</strong> <span className="text-gray-600 dark:text-gray-400">{new Date(flag.createdAt).toLocaleString()}</span></p>
          <p><strong>Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
            flag.status === 'pending_review' ? 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100' :
            flag.status.startsWith('resolved_') ? 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100' :
            'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
          }`}>{flag.status.replace('_', ' ').toUpperCase()}</span></p>
        </div>

        {/* Column 2 & 3: Resolution Form or Resolution Details */}
        <div className="md:col-span-2">
          {flag.status === 'pending_review' ? (
            <form onSubmit={handleSubmitResolution} className="space-y-3">
              <h4 className="text-md font-semibold text-gray-700 dark:text-gray-200">Resolve Flag</h4>
              <div>
                <label htmlFor={`resolutionAction-${flag._id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Action</label>
                <Select id={`resolutionAction-${flag._id}`} value={resolutionAction} onChange={(e) => setResolutionAction(e.target.value as ResolutionAction)} disabled={isSubmitting}>
                  {resolutionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label htmlFor={`moderatorNotes-${flag._id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">Moderator Notes (Optional)</label>
                <Textarea id={`moderatorNotes-${flag._id}`} value={moderatorNotes} onChange={(e) => setModeratorNotes(e.target.value)} disabled={isSubmitting} placeholder="Internal notes about the resolution..." />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? 'Submitting...' : 'Submit Resolution'}
              </Button>
            </form>
          ) : (
            <div>
              <h4 className="text-md font-semibold text-gray-700 dark:text-gray-200">Resolution Details</h4>
              <p className="text-sm"><strong>Moderator:</strong> <span className="text-gray-600 dark:text-gray-400">{flag.moderatorUserId || 'N/A'}</span></p> {/* TODO: Fetch/display moderator name */}
              {flag.moderatorNotes && <p className="text-sm"><strong>Notes:</strong> <span className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{flag.moderatorNotes}</span></p>}
              <p className="text-sm"><strong>Resolved At:</strong> <span className="text-gray-600 dark:text-gray-400">{new Date(flag.updatedAt).toLocaleString()}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlaggedContentItem;
