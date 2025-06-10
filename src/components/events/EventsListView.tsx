import React from 'react';
import { EventFromAPI } from '../../hooks/useEvents';
import EventListItem from './EventListItem';
// Assuming a LoadingSpinner component exists, otherwise use simple text
// import LoadingSpinner from '../ui/LoadingSpinner';

interface EventsListViewProps {
  events: EventFromAPI[];
  isLoading: boolean;
  error: string | null;
}

const EventsListView: React.FC<EventsListViewProps> = ({ events, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        {/* <LoadingSpinner /> */}
        <p className="text-lg text-gray-500">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No events found</h3>
        <p className="mt-1 text-sm text-gray-500">There are currently no events to display. Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div>
      {events.map(event => (
        <EventListItem key={event._id} event={event} />
      ))}
    </div>
  );
};

export default EventsListView;
