import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentList from './CommentList'; // Adjust path as necessary
import { CommentData, CommentsApiResponse, CommentResourceType } from '../../types/comments'; // Adjust
import { UserProfile } from '../../types/collaborators'; // For current user

// Mock useAuth hook
let mockCurrentUser: UserProfile | null = { id: 'user-123', name: 'Test User', email: 'test@example.com' };
jest.mock('../../hooks/useAuth', () => ({ // Adjust path to your useAuth hook
  useAuth: () => ({ currentUser: mockCurrentUser }),
}));

// Mock react-router-dom's useNavigate (used in CommentItem)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // Preserve other exports
  useNavigate: () => mockNavigate,
}));


// Mock fetch
global.fetch = jest.fn();

const mockResourceId = 'event-abc';
const mockResourceType: CommentResourceType = 'Event';
const mockResourceOwnerId = 'owner-of-event-456';

const mockInitialComments: CommentData[] = [
  { _id: 'comment-1', resourceId: mockResourceId, resourceType: mockResourceType, userId: 'user-789', userName: 'Alice', content: 'First comment here!', createdAt: new Date(Date.now() - 200000).toISOString(), updatedAt: new Date().toISOString(), edited: false },
  { _id: 'comment-2', resourceId: mockResourceId, resourceType: mockResourceType, userId: 'user-101', userName: 'Bob', content: 'Second comment, nice!', parentId: null, createdAt: new Date(Date.now() - 100000).toISOString(), updatedAt: new Date().toISOString(), edited: false },
  { _id: 'comment-3', resourceId: mockResourceId, resourceType: mockResourceType, userId: 'user-789', userName: 'Alice', content: 'Reply to Bob.', parentId: 'comment-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), edited: false },
];

const mockCommentsResponse: CommentsApiResponse = {
  data: mockInitialComments,
  pagination: { page: 1, limit: 20, totalItems: mockInitialComments.length, totalPages: 1 },
};

describe('CommentList', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    mockNavigate.mockClear();
    // Default fetch mock for GET comments
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCommentsResponse,
    });
  });

  it('fetches and displays a list of comments, including nested replies', async () => {
    render(
      <CommentList
        resourceId={mockResourceId}
        resourceType={mockResourceType}
        resourceOwnerId={mockResourceOwnerId}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('First comment here!')).toBeInTheDocument();
      expect(screen.getByText('Second comment, nice!')).toBeInTheDocument();
    });

    // Check for API call
    expect(fetch).toHaveBeenCalledWith(`/api/${mockResourceType}/${mockResourceId}/comments?page=1&limit=20&sort=createdAt`);

    // Check for reply (basic check, styling/indentation would be visual)
    // Ensure the reply text is present. The structure check is harder with flat rendering then client processing.
    await waitFor(() => {
        expect(screen.getByText('Reply to Bob.')).toBeInTheDocument();
    });
    // A more robust test for nesting might involve checking DOM structure if specific classes for indentation are applied.
  });

  it('simulates submitting the AddCommentForm for a new top-level comment and displays it', async () => {
    render(
      <CommentList
        resourceId={mockResourceId}
        resourceType={mockResourceType}
        resourceOwnerId={mockResourceOwnerId}
      />
    );
    await waitFor(() => expect(screen.getByText('First comment here!')).toBeInTheDocument()); // Wait for initial load

    const newCommentContent = 'This is a brand new comment.';
    const newCommentData: CommentData = {
      _id: 'comment-new',
      resourceId: mockResourceId,
      resourceType: mockResourceType,
      userId: mockCurrentUser!.id,
      userName: mockCurrentUser!.name!,
      content: newCommentContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      edited: false,
    };

    // Mock the POST request for adding a comment
    (fetch as jest.Mock).mockImplementationOnce(async (url: string, options: RequestInit) => {
        if (options.method === 'POST' && url.includes(`/api/${mockResourceType}/${mockResourceId}/comments`)) {
            const body = JSON.parse(options.body as string);
            return {
                ok: true,
                json: async () => ({ ...newCommentData, content: body.content }) // Return the new comment structure
            };
        }
        return { ok: false, json: async () => ({ message: 'Mock error for POST' }) };
    });

    fireEvent.change(screen.getByPlaceholderText(/Write a comment.../i), {
      target: { value: newCommentContent },
    });

    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Post Comment/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/${mockResourceType}/${mockResourceId}/comments`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: newCommentContent, parentId: undefined }), // parentId is undefined for top-level
        })
      );
      // The new comment should appear at the top of the list (as per handleCommentAdded logic)
      const commentElements = screen.getAllByText(/comment/i);
      // Check if the new comment text is the first among comment-like texts or ensure it's present
      expect(screen.getByText(newCommentContent)).toBeInTheDocument();
    });
  });

  // TODO:
  // - Test "Load More" button functionality.
  // - Test replying to a comment (AddCommentForm appears with parentId).
  // - Test editing a comment (AddCommentForm appears in edit mode).
  // - Test deleting a comment (verifying UI update and API call).
  // - Test permissions for edit/delete buttons based on currentUserId and resourceOwnerId.
});
