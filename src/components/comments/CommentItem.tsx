import React from 'react';
import { CommentData } from '../../types/comments'; // Adjust path if necessary
import { formatDistanceToNowStrict } from 'date-fns';
// Assuming Button component from UI library or a dummy one
// import { Button } from '../ui/Button';

// Dummy Button component
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string, 'aria-label'?:string }) => (
  <button
    className={`px-2 py-1 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1
                ${props.disabled ? 'text-gray-400 bg-gray-200 cursor-not-allowed' :
                  (props.variant === 'danger' ? 'text-red-600 hover:text-red-800 focus:ring-red-500' :
                   (props.variant === 'secondary' ? 'text-gray-600 hover:text-gray-800 focus:ring-gray-500' :
                    'text-blue-600 hover:text-blue-800 focus:ring-blue-500'))}
                ${props.size === 'small' ? 'text-xs' : 'text-sm'}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);

// Dummy Avatar/Image component
const Avatar = ({ src, alt, size = '8' }: { src?: string; alt: string; size?: string }) => {
  const sizeClass = `h-${size} w-${size}`;
  if (src) {
    return <img className={`${sizeClass} rounded-full object-cover border border-gray-300`} src={src} alt={alt} />;
  }
  // Fallback initials or generic icon
  const initials = alt.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  return (
    <div className={`${sizeClass} rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold text-xs`}>
      {initials || '?'}
    </div>
  );
};


interface CommentItemProps {
  comment: CommentData;
  currentUserId: string | null;
  resourceOwnerId: string | null;
  onEdit: (commentId: string, currentContent: string) => void;
  onDelete: (commentId: string) => Promise<void>;
  onReply: (comment: CommentData) => void; // Pass the full comment to set as parent context
  className?: string;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  resourceOwnerId,
  onEdit,
  onDelete,
  onReply,
  className = '',
}) => {
  const canEdit = currentUserId === comment.userId;
  const canDelete = currentUserId === comment.userId || currentUserId === resourceOwnerId;

  const timeAgo = comment.createdAt
    ? formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })
    : 'some time ago';

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string|null>(null);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
        await onDelete(comment._id);
        // Parent component will handle removing it from the list
    } catch (err) {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete comment.');
    } finally {
        setIsDeleting(false);
    }
  }

  return (
    <div className={`flex space-x-3 py-3 ${className}`}>
      <div className="flex-shrink-0 mt-1">
        <Avatar src={comment.userProfileImageUrl} alt={comment.userName || 'User'} size="8" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{comment.userName || 'Anonymous'}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {timeAgo}
              {comment.edited && <span className="italic ml-1">(edited)</span>}
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap py-1">{comment.content}</p>
        <div className="mt-1 flex items-center space-x-3">
          <Button variant="secondary" size="small" onClick={() => onReply(comment)}>
            Reply
          </Button>
          {canEdit && (
            <Button variant="secondary" size="small" onClick={() => onEdit(comment._id, comment.content)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="danger" size="small" onClick={handleDelete} disabled={isDeleting} aria-label="Delete comment">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
        </div>
        {deleteError && <p className="text-xs text-red-500 mt-1">{deleteError}</p>}
      </div>
    </div>
  );
};

export default CommentItem;
