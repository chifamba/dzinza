import React from 'react';
import { Link } from 'react-router-dom'; // Or Next.js Link
import { SearchResultItem, EventData } from '../../types/search'; // Adjust path
import { CalendarEvent, MapPin, Hash, Type, CalendarDays } from 'lucide-react'; // Added CalendarDays explicitly

interface EventSearchResultItemProps {
  item: SearchResultItem;
}

const formatDate = (dateString?: string): string | null => {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return dateString; // Return original if formatting fails
  }
};

const EventSearchResultItem: React.FC<EventSearchResultItemProps> = ({ item }) => {
  const event = item._source as EventData;

  const displayDate = formatDate(event.eventDate);
  const displayEndDate = event.endDate && event.endDate !== event.eventDate ? formatDate(event.endDate) : null;

  const titleContent = item.highlight?.title?.[0]
    ? <span dangerouslySetInnerHTML={{ __html: item.highlight.title[0] }} />
    : (event.title || 'Untitled Event');

  const contentSnippet = item.highlight?.plainTextContent?.[0]
    ? <span dangerouslySetInnerHTML={{ __html: item.highlight.plainTextContent[0] }} />
    : (event.plainTextContent
        ? event.plainTextContent.substring(0, 200) + (event.plainTextContent.length > 200 ? '...' : '')
        : 'No content preview available.');

  const categoryContent = item.highlight?.category?.[0]
    ? <span dangerouslySetInnerHTML={{ __html: item.highlight.category[0] }} />
    : event.category;

  return (
    <div className="p-4 my-2 bg-white dark:bg-gray-800 shadow rounded-lg hover:shadow-md transition-shadow">
      <Link to={`/events/${item._id}`} className="group"> {/* Use item._id for link */}
        <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 group-hover:underline mb-1">
          <CalendarEvent size={20} className="inline mr-2 opacity-75" />
          {titleContent}
        </h3>
      </Link>

      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-2">
        {displayDate && (
          <p className="flex items-center">
            <CalendarDays size={14} className="inline mr-1.5 opacity-70" />
            Date: {displayDate}
            {displayEndDate && ` – ${displayEndDate}`}
          </p>
        )}
        {event.placeName && ( // Highlighting for placeName can be added if configured
          <p className="flex items-center">
            <MapPin size={14} className="inline mr-1.5 opacity-70" />
            Location: {item.highlight?.placeName?.[0] ? <span dangerouslySetInnerHTML={{ __html: item.highlight.placeName[0] }} /> : event.placeName}
          </p>
        )}
        {event.category && (
          <p className="flex items-center">
            <Type size={14} className="inline mr-1.5 opacity-70" />
            Category: <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">{categoryContent}</span>
          </p>
        )}
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
        {contentSnippet}
      </p>

      { (event.tags && event.tags.length > 0) || item.highlight?.tags ? (
        <div className="flex flex-wrap gap-1.5">
          <Hash size={14} className="inline mr-1 opacity-70 mt-0.5 text-gray-500 dark:text-gray-400" />
          {/* If tags are highlighted, they come as an array of highlighted strings */}
          {item.highlight?.tags
            ? item.highlight.tags.map((tagHtml, index) => (
                <span key={`highlight-tag-${index}`} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full text-xs" dangerouslySetInnerHTML={{ __html: tagHtml }} />
              ))
            : event.tags?.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded-full text-xs">
                  {tag}
                </span>
              ))}
        </div>
      ) : null}
    </div>
  );
};

export default EventSearchResultItem;
