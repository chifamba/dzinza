import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button'; // Adjust path as needed
import { logger } from '@shared/utils/logger'; // Use alias

interface DisplayedEvent {
  _id: string;
  title: string;
  content: string; // Raw HTML content for now
  date?: string; // ISO string or formatted date string
  category?: string;
  // Add other fields you might want to display directly on the list
}

interface FetchEventsResponse {
  data: DisplayedEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const EventListPage: React.FC = () => {
  const [events, setEvents] = useState<DisplayedEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const navigate = useNavigate();
  const eventsPerPage = 10;

  const fetchEvents = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events?page=${page}&limit=${eventsPerPage}&sortBy=date&sortOrder=desc`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch events. Status: ${response.status}`);
      }
      const result: FetchEventsResponse = await response.json();
      setEvents(result.data);
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      logger.error('Error fetching events:', { error: errorMessage, page });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(currentPage);
  }, [fetchEvents, currentPage]);

  const handleDelete = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    setIsLoading(true); // Indicate loading for delete operation
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
        // Auth header if needed
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete event. Status: ${response.status}`);
      }
      logger.info(`Event ${eventId} deleted successfully.`);
      // Refresh the list. If on the last page and it becomes empty, go to previous page.
      if (events.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchEvents(currentPage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while deleting.';
      setError(errorMessage); // Show error to user
      logger.error(`Error deleting event ${eventId}:`, { error: errorMessage });
      setIsLoading(false); // Clear loading on error
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_e) { // Renamed e to _e
      return dateString; // Fallback to original string if date is invalid
    }
  };

  // Basic HTML stripper for content snippet (very naive)
  const createSnippet = (htmlContent: string, maxLength: number = 100) => {
    const textContent = htmlContent.replace(/<[^>]+>/g, ' '); // Replace HTML tags with space
    const cleanedText = textContent.replace(/\s\s+/g, ' ').trim(); // Replace multiple spaces with single and trim
    if (cleanedText.length <= maxLength) {
      return cleanedText;
    }
    return cleanedText.substring(0, maxLength) + '...';
  };

  return (
    <div className="container mx-auto p-4">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Events and Stories</h1>
        <Button onClick={() => navigate('/events/create')}>
          Create New Event
        </Button>
      </header>

      {isLoading && <p className="text-center text-gray-500">Loading events...</p>}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded text-center" role="alert">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <p className="text-center text-gray-500">No events found. Why not create one?</p>
      )}

      {!isLoading && !error && events.length > 0 && (
        <div className="space-y-6">
          {events.map(event => (
            <div key={event._id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <h2 className="text-xl font-semibold text-indigo-700 mb-2">{event.title}</h2>
              <p className="text-sm text-gray-500 mb-1">Date: {formatDate(event.date)}</p>
              {event.category && <p className="text-sm text-gray-500 mb-3">Category: <span className="font-medium">{event.category}</span></p>}
              <div className="text-gray-700 prose prose-sm max-h-28 overflow-hidden relative">
                 {/* Using dangerouslySetInnerHTML for HTML content is risky if content is not sanitized.
                     For now, displaying a snippet of text content.
                     A proper solution would sanitize or use a safe HTML renderer.
                  */}
                <p>{createSnippet(event.content)}</p>
              </div>
              <div className="mt-4 flex space-x-3">
                <Link to={`/events/edit/${event._id}`}>
                  <Button variant="outline" size="sm">Edit</Button>
                </Link>
                <Button variant="danger" size="sm" onClick={() => handleDelete(event._id)} disabled={isLoading}>
                  Delete
                </Button>
                 {/* Placeholder for a "View Details" link if a dedicated view page is created */}
                {/* <Link to={`/events/${event._id}`}>
                  <Button variant="secondary" size="sm">View Details</Button>
                </Link> */}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-4">
          <Button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventListPage;
