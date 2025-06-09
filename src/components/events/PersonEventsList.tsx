import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '@shared/utils/logger'; // Use alias

interface DisplayedEvent {
  _id: string;
  title: string;
  content: string; // Raw HTML content
  date?: string; // ISO string or formatted date string
  category?: string;
}

interface FetchEventsResponse {
  data: DisplayedEvent[];
  // Assuming pagination data might come, though not strictly used in this component's display
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface PersonEventsListProps {
  personId: string;
}

const PersonEventsList: React.FC<PersonEventsListProps> = ({ personId }) => {
  const [events, setEvents] = useState<DisplayedEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const createSnippet = (htmlContent: string, maxLength: number = 100) => {
    const textContent = htmlContent.replace(/<[^>]+>/g, ' ');
    const cleanedText = textContent.replace(/\s\s+/g, ' ').trim();
    if (cleanedText.length <= maxLength) {
      return cleanedText;
    }
    return cleanedText.substring(0, maxLength) + '...';
  };

  const fetchPersonEvents = useCallback(async (pId: string) => {
    if (!pId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events?relatedPersonId=${pId}&sortBy=date&sortOrder=desc`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch events for person ${pId}. Status: ${response.status}`);
      }
      const result: FetchEventsResponse = await response.json();
      setEvents(result.data || []); // Ensure events is an array even if data is missing
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error(`Error fetching events for person ${pId}:`, { error: errorMessage });
      setEvents([]); // Clear events on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonEvents(personId);
  }, [personId, fetchPersonEvents]);

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Loading related events...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500" role="alert">
        <p className="font-semibold">Error loading events:</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Related Events & Stories</h3>
      {events.length === 0 ? (
        <p className="text-gray-600">No events found for this person.</p>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event._id} className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow">
              <h4 className="text-lg font-medium text-indigo-600">{event.title}</h4>
              <p className="text-sm text-gray-500 mb-1">Date: {formatDate(event.date)}</p>
              {event.category && <p className="text-xs text-gray-500 mb-2">Category: <span className="font-normal">{event.category}</span></p>}
              <p className="text-sm text-gray-600 prose prose-sm max-h-20 overflow-hidden">
                {createSnippet(event.content)}
              </p>
              <div className="mt-3">
                <Link
                  to={`/events/edit/${event._id}`}
                  className="text-sm text-indigo-500 hover:text-indigo-700 font-medium"
                >
                  Edit Event
                </Link>
                {/* Optionally, a link to a full event view page could go here */}
                {/* <Link to={`/events/${event._id}`} className="ml-4 text-sm text-gray-500 hover:text-gray-700">View Details</Link> */}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonEventsList;
