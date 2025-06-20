import React from 'react';
import Link from 'next/link'; // Assuming Next.js for linking
import { EventFromAPI } from '../../hooks/useEvents'; // Import the interface

interface EventListItemProps {
  event: EventFromAPI;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (_e) { // Renamed e to _e
    return dateString; // Return original if formatting fails
  }
};

const EventListItem: React.FC<EventListItemProps> = ({ event }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6 transition-shadow duration-300 hover:shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-3">
        <h2 className="text-2xl font-semibold text-blue-700 hover:text-blue-900 mb-2 sm:mb-0">
          <Link href={`/events/${event._id}`}>
            {event.title || 'Untitled Event'}
          </Link>
        </h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full text-white
          ${event.privacy === 'public' ? 'bg-green-500' : ''}
          ${event.privacy === 'private' ? 'bg-red-500' : ''}
          ${event.privacy === 'family' ? 'bg-yellow-500 text-gray-800' : ''}
        `}>
          {event.privacy?.toUpperCase()}
        </span>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>
          <span className="font-semibold">Date:</span> {formatDate(event.date)}
          {event.endDate && event.endDate !== event.date && (
            <> - {formatDate(event.endDate)}</>
          )}
        </p>
        {event.place?.name && (
          <p><span className="font-semibold">Location:</span> {event.place.name}</p>
        )}
        {event.category && (
          <p><span className="font-semibold">Category:</span> {event.category}</p>
        )}
      </div>

      {event.contentSnippet && (
        <p className="text-gray-700 mb-4 leading-relaxed prose prose-sm max-w-none">
          {event.contentSnippet}
        </p>
      )}

      {event.relatedPersons && event.relatedPersons.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm text-gray-800 mb-1">Related Persons:</h4>
          <div className="flex flex-wrap gap-2">
            {event.relatedPersons.map(person => (
              <Link key={person.id} href={`/persons/${person.id}`} legacyBehavior>
                <a className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded-md transition-colors">
                  {person.name}
                </a>
              </Link>
            ))}
          </div>
        </div>
      )}

      {event.tags && event.tags.length > 0 && (
        <div className="mb-2">
          <h4 className="font-semibold text-sm text-gray-800 mb-1">Tags:</h4>
          <div className="flex flex-wrap gap-2">
            {event.tags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventListItem;
