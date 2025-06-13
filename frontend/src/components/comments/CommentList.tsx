import React, { useState, useEffect, useCallback } from 'react';
import { CommentData, CommentsApiResponse, CommentResourceType } from '../../types/comments'; // Adjust path
import CommentItem from './CommentItem';
import AddCommentForm from './AddCommentForm';
// import { useAuth } from '../../hooks/useAuth'; // Assuming a real useAuth hook
import { logger } from '@shared/utils/logger';
// import { Button } from '../ui/Button';

// --- Mock useAuth for standalone page development ---
const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<{ id: string | null; name?: string; email?: string } | null>(null);
  useEffect(() => {
    setCurrentUser({ id: 'current-user-id-123', name: 'Current User', email: 'currentUser@example.com' });
  }, []);
  return { currentUser };
};
// --- End Mock ---

// Dummy Button component
const Button = ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string}) => (
  <button
    className={`px-4 py-2 font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2
                ${props.disabled ? 'text-gray-400 bg-gray-200 cursor-not-allowed' :
                  (props.variant === 'link' ? 'text-blue-600 hover:text-blue-800' :
                  'text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500')}
                ${props.className || ''}`}
    {...props}
  >
    {children}
  </button>
);
const LoadingSpinner = () => <div className="text-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div></div>;


interface CommentListProps {
  resourceId: string;
  resourceType: CommentResourceType;
  resourceOwnerId: string | null; // To pass to CommentItem for delete privileges
}

const CommentList: React.FC<CommentListProps> = ({ resourceId, resourceType, resourceOwnerId }) => {
  const { currentUser } = useAuth(); // Mocked
  const [comments, setComments] = useState<CommentData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [replyingTo, setReplyingTo] = useState<CommentData | null>(null); // For replying to a specific comment
  const [editingComment, setEditingComment] = useState<CommentData | null>(null); // For editing a specific comment

  const fetchComments = useCallback(async (pageToFetch = 1, newLimit?: number) => {
    setIsLoading(true);
    setError(null);
    const currentLimit = newLimit || pagination.limit;
    try {
      const response = await fetch(`/api/${resourceType}/${resourceId}/comments?page=${pageToFetch}&limit=${currentLimit}&sort=createdAt`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to fetch comments. Status: ${response.status}`);
      }
      const result: CommentsApiResponse = await response.json();

      // If fetching page 1, replace comments. Otherwise, append.
      setComments(pageToFetch === 1 ? (result.data || []) : prev => [...prev, ...(result.data || [])]);

      setPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error(`Error fetching comments for ${resourceType} ${resourceId}:`, err);
    } finally {
      setIsLoading(false);
    }
  }, [resourceId, resourceType, pagination.limit]);

  useEffect(() => {
    if (resourceId && resourceType) {
      fetchComments(1); // Fetch initial page on mount or when resource changes
    }
  }, [resourceId, resourceType, fetchComments]);

  const handleCommentAdded = (newComment: CommentData) => {
    if (editingComment && newComment._id === editingComment._id) { // If it was an edit
      setComments(prevComments => prevComments.map(c => c._id === newComment._id ? newComment : c));
    } else if (newComment.parentId) { // If it was a reply
      // Add reply to the parent's 'replies' array or refetch to get updated structure
      // For simplicity, refetching the whole list is easier than managing nested state deeply.
      // Or, if API returns parent with updated replies:
      // setComments(prev => prev.map(p => p._id === newComment.parentId ? { ...p, replies: [...(p.replies || []), newComment]} : p));
      fetchComments(1, pagination.limit * pagination.page); // Refetch all loaded comments
    } else { // New top-level comment
      setComments(prevComments => [newComment, ...prevComments]); // Add to top for immediate visibility
      setPagination(prev => ({...prev, totalItems: prev.totalItems + 1}));
    }
    setReplyingTo(null);
    setEditingComment(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    // API call is in CommentItem, this is the success handler
    setComments(prevComments => prevComments.filter(c => c._id !== commentId));
    // Also need to remove from replies if it was a nested comment
    setComments(prevComments => prevComments.map(p => ({
        ...p,
        replies: p.replies?.filter(r => r._id !== commentId)
    })));
    setPagination(prev => ({...prev, totalItems: prev.totalItems - 1}));

  };

  const handleEditComment = (commentId: string, currentContent: string) => {
    const commentToEdit = findComment(comments, commentId);
    if (commentToEdit) {
      setEditingComment(commentToEdit);
      setReplyingTo(null); // Clear any reply state
    }
  };

  const findComment = (list: CommentData[], commentId: string): CommentData | null => {
    for (const comment of list) {
        if (comment._id === commentId) return comment;
        if (comment.replies) {
            const foundInReply = findComment(comment.replies, commentId);
            if (foundInReply) return foundInReply;
        }
    }
    return null;
  };


  const handleSetReplyTo = (comment: CommentData) => {
    setReplyingTo(comment);
    setEditingComment(null); // Clear any edit state
  };

  const handleCancelReply = () => setReplyingTo(null);
  const handleCancelEdit = () => setEditingComment(null);

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      fetchComments(pagination.page + 1);
    }
  };

  // Basic threading: Group comments by parentId
  const threadedComments = comments.reduce((acc, comment) => {
    if (comment.parentId) {
      const parent = acc.find(c => c._id === comment.parentId);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(comment);
      } else {
        // Orphaned reply if parent not in current fetched list (can happen with pagination)
        // For now, just add it to top level, or filter out.
        // Or, ensure API sends parents if children are sent.
        // For simplicity, we'll assume flat list from API initially, and group here.
        // If API sends flat, and parent is on a previous page, this reply might appear top-level.
         acc.push(comment); // Add as top-level if parent not found in current batch
      }
    } else {
      acc.push(comment);
    }
    return acc;
  }, [] as CommentData[]);

  const renderCommentNode = (comment: CommentData, depth: number = 0) => (
    <div key={comment._id} className={`${depth > 0 ? 'ml-4 sm:ml-8 md:ml-12' : ''} py-1`}>
      <CommentItem
        comment={comment}
        currentUserId={currentUser?.id || null}
        resourceOwnerId={resourceOwnerId}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment} // onDelete in CommentItem calls API, this is post-API success
        onReply={handleSetReplyTo}
        className={depth > 0 ? 'border-l-2 border-gray-200 pl-3' : ''}
      />
      {/* Render Reply Form for this comment if active */}
      {replyingTo?._id === comment._id && !editingComment && (
        <div className="ml-8 mt-2">
          <AddCommentForm
            resourceId={resourceId}
            resourceType={resourceType}
            parentId={replyingTo._id}
            onCommentAdded={handleCommentAdded}
            replyingToUser={replyingTo.userName}
            onCancelReply={handleCancelReply}
          />
        </div>
      )}
      {/* Render Edit Form for this comment if active */}
      {editingComment?._id === comment._id && !replyingTo && (
         <div className="mt-2">
            <AddCommentForm
                resourceId={resourceId}
                resourceType={resourceType}
                isEditing={true}
                commentToEdit={editingComment}
                onCommentAdded={handleCommentAdded}
                onEditComplete={handleCancelEdit}
                onCancelEdit={handleCancelEdit}
            />
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1">
          {comment.replies.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(reply => renderCommentNode(reply, depth + 1))}
        </div>
      )}
    </div>
  );


  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
        Comments ({pagination.totalItems > 0 ? pagination.totalItems : '0'})
      </h3>

      {/* Add new top-level comment form (only if not currently editing or replying to specific comment) */}
      {!replyingTo && !editingComment && currentUser && (
        <div className="py-2">
            <h4 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-1">Leave a comment:</h4>
            <AddCommentForm
                resourceId={resourceId}
                resourceType={resourceType}
                onCommentAdded={handleCommentAdded}
            />
        </div>
      )}
      {editingComment && !replyingTo && ( // General message if an edit form is open elsewhere
        <p className="text-sm text-blue-600">Editing a comment...</p>
      )}
      {replyingTo && !editingComment && ( // General message if a reply form is open elsewhere
         <p className="text-sm text-blue-600">Replying to a comment...</p>
      )}


      {isLoading && comments.length === 0 && <LoadingSpinner />}
      {error && <div className="p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">{error}</div>}

      {!isLoading && !error && comments.length === 0 && pagination.totalItems === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
      )}

      <div className="space-y-1">
        {threadedComments.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(comment => renderCommentNode(comment))}
      </div>

      {pagination.page < pagination.totalPages && !isLoading && (
        <div className="text-center mt-6">
          <Button onClick={handleLoadMore} variant="link">
            Load More Comments
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommentList;
