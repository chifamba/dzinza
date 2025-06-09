import React, { useState, useEffect } from 'react';
import { CommentData, CommentResourceType } from '../../types/comments'; // Adjust path
// import { Button } from '../ui/Button';
// import { Textarea } from '../ui/Textarea'; // Assuming a Textarea component
import { logger } from '@shared/utils/logger';

// Dummy UI components
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
const Textarea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="border border-gray-300 rounded px-3 py-2 w-full focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100" rows={3} {...props}></textarea>;


interface AddCommentFormProps {
  resourceId: string;
  resourceType: CommentResourceType;
  parentId?: string | null;
  onCommentAdded: (newComment: CommentData) => void; // For both new and edited comments

  // For editing existing comment
  isEditing?: boolean;
  commentToEdit?: CommentData | null; // Pass the full comment being edited
  onEditComplete?: () => void; // To signal edit mode should end

  // For replying
  replyingToUser?: string | null; // Name of the user being replied to, for display
  onCancelReply?: () => void; // To hide the reply form
  onCancelEdit?: () => void; // To hide the edit form
}

const AddCommentForm: React.FC<AddCommentFormProps> = ({
  resourceId,
  resourceType,
  parentId,
  onCommentAdded,
  isEditing = false,
  commentToEdit,
  onEditComplete,
  replyingToUser,
  onCancelReply,
  onCancelEdit,
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && commentToEdit) {
      setContent(commentToEdit.content);
    } else {
      setContent(''); // Reset for new comment/reply
    }
  }, [isEditing, commentToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Comment cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      let response;
      let responseData;

      if (isEditing && commentToEdit) {
        // --- Edit existing comment ---
        response = await fetch(`/api/comments/${commentToEdit._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
          body: JSON.stringify({ content }),
        });
        responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || responseData.errors?.[0]?.msg || 'Failed to update comment.');
        }
        onCommentAdded(responseData); // Parent updates the comment in its list
        if (onEditComplete) onEditComplete();
      } else {
        // --- Add new comment or reply ---
        response = await fetch(`/api/${resourceType}/${resourceId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' /* Auth handled globally */ },
          body: JSON.stringify({ content, parentId }),
        });
        responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || responseData.errors?.[0]?.msg || 'Failed to post comment.');
        }
        onCommentAdded(responseData); // Parent adds the new comment to its list
        if (parentId && onCancelReply) onCancelReply(); // If it was a reply, clear reply state
      }

      setContent(''); // Clear textarea after successful submission
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error('Error submitting comment:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlaceholder = isEditing ? "Edit your comment..." :
                             replyingToUser ? `Replying to ${replyingToUser}...` :
                             "Write a comment...";
  const submitButtonText = isEditing ? (isLoading ? 'Saving...' : 'Save Changes') :
                           parentId ? (isLoading ? 'Replying...' : 'Post Reply') :
                           (isLoading ? 'Posting...' : 'Post Comment');

  const handleCancel = () => {
    if (isEditing && onCancelEdit) {
      onCancelEdit();
    } else if (parentId && onCancelReply) {
      onCancelReply();
    }
    setContent('');
    setError(null);
  };


  return (
    <form onSubmit={handleSubmit} className="mt-3">
      {replyingToUser && !isEditing && (
        <p className="text-xs text-gray-500 mb-1">
          Replying to: <span className="font-semibold">{replyingToUser}</span>
        </p>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={currentPlaceholder}
        required
        disabled={isLoading}
        maxLength={2000}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <div className="mt-2 flex items-center space-x-3">
        <Button type="submit" disabled={isLoading || !content.trim()}>
          {submitButtonText}
        </Button>
        {(isEditing || parentId) && ( // Show cancel if editing or replying
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={isLoading}>
                Cancel
            </Button>
        )}
      </div>
    </form>
  );
};

export default AddCommentForm;
