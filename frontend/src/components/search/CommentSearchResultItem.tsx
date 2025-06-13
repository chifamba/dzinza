import React from 'react';
import { Link } from 'react-router-dom'; // Or Next.js Link
import { SearchResultItem, CommentData } from '../../types/search'; // Adjust path
import { MessageSquare, User, CalendarClock } from 'lucide-react'; // Example icons
import { formatDistanceToNowStrict } from 'date-fns';

interface CommentSearchResultItemProps {
  item: SearchResultItem;
}

const CommentSearchResultItem: React.FC<CommentSearchResultItemProps> = ({ item }) => {
  const comment = item._source as CommentData;

  const contentDisplay = item.highlight?.content?.[0]
    ? <span dangerouslySetInnerHTML={{ __html: item.highlight.content[0] }} />
    : (comment.content
        ? comment.content.substring(0, 180) + (comment.content.length > 180 ? '...' : '')
        : 'No content.');

  const userNameDisplay = item.highlight?.userName?.[0]
    ? <span dangerouslySetInnerHTML={{ __html: item.highlight.userName[0] }} />
    : (comment.userName || 'Anonymous');

  const timeAgo = comment.createdAt
    ? formatDistanceToNowStrict(new Date(comment.createdAt), { addSuffix: true })
    : '';

  // Construct link to the resource (event/story) and highlight the comment
  let resourceLink = '#';
  // Use item._id for commentId in the link, as it's the ES document ID (_id of the comment)
  if (comment.resourceType && comment.resourceId) {
    const resourcePath = comment.resourceType.toLowerCase() === 'event' ? 'events' :
                         comment.resourceType.toLowerCase() === 'story' ? 'stories' :
                         '#';
    if (resourcePath !== '#') {
      resourceLink = `/${resourcePath}/${comment.resourceId}?commentId=${item._id}`;
    }
  }

  return (
    <div className="p-4 my-2 bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow">
      <Link to={resourceLink} className="group">
        <div className="flex items-start space-x-2 mb-1">
            <MessageSquare size={18} className="inline mt-0.5 text-yellow-600 dark:text-yellow-400 opacity-80" />
            <h4 className="text-md font-semibold text-yellow-700 dark:text-yellow-500 group-hover:underline">
                Comment Snippet
            </h4>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic mb-2">
          "{contentDisplay}"
        </p>
      </Link>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
        { (comment.userName || item.highlight?.userName) && (
          <p className="flex items-center">
            <User size={14} className="inline mr-1.5 opacity-70" />
            By: <span className="font-medium ml-1">{userNameDisplay}</span>
          </p>
        )}
        {timeAgo && (
             <p className="flex items-center">
                <CalendarClock size={14} className="inline mr-1.5 opacity-70" />
                Posted: {timeAgo}
            </p>
        )}
        {comment.resourceType && comment.resourceId && (
            <p className="text-xs">
                On: <span className="font-medium capitalize">{comment.resourceType}</span>
            </p>
        )}
      </div>
    </div>
  );
};

export default CommentSearchResultItem;
