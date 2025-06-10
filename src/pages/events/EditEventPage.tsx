import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EventForm, EventFormData } from '../../components/events'; // Adjust path as needed

// This interface represents the structure of the event data coming from the API (matches IEvent more closely)
interface ApiEventData {
  _id: string;
  title: string;
  content: string;
  date?: string; // ISO string from API
  endDate?: string; // ISO string from API
  place?: {
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  category?: string;
  tags: string[]; // Array of strings from API
  privacy: 'public' | 'private' | 'family';
  familyTreeId?: string;
  relatedPersons: string[]; // Array of strings from API
  associatedMediaIds: string[]; // Array of strings from API
  userId: string;
  // other fields like createdAt, updatedAt can be here but are not typically part of EventFormData
}


const EditEventPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [initialEventData, setInitialEventData] = useState<Partial<EventFormData> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start true for initial fetch
  const [error, setError] = useState<string | null>(null);

  // Transforms data from API (IEvent like) to EventFormData
  const transformApiToFormData = (apiData: ApiEventData): Partial<EventFormData> => {
    return {
      title: apiData.title,
      content: apiData.content,
      date: apiData.date ? new Date(apiData.date).toISOString().split('T')[0] : '',
      endDate: apiData.endDate ? new Date(apiData.endDate).toISOString().split('T')[0] : '',
      placeName: apiData.place?.name || '',
      category: apiData.category || '',
      tags: Array.isArray(apiData.tags) ? apiData.tags.join(', ') : '', // Keep tags as string for now, form handles it as text input
      privacy: apiData.privacy,
      familyTreeId: apiData.familyTreeId || '',
      relatedPersons: apiData.relatedPersons || [], // Pass as string[]
      associatedMediaIds: Array.isArray(apiData.associatedMediaIds) ? apiData.associatedMediaIds.join(', ') : '', // Keep as string for now
    };
  };

  // Transforms EventFormData to the format expected by the PUT API endpoint
  const transformFormDataForApi = (formData: EventFormData) => {
    return {
      ...formData, // Spreads all fields including title, content, privacy, relatedPersons (now string[])
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      // relatedPersons: formData.relatedPersons.split(',').map(id => id.trim()).filter(id => id), // No longer needed, it's already string[]
      associatedMediaIds: formData.associatedMediaIds.split(',').map(id => id.trim()).filter(id => id),
      date: formData.date || undefined,
      endDate: formData.endDate || undefined,
      familyTreeId: formData.familyTreeId || undefined,
      category: formData.category || undefined,
      place: formData.placeName ? { name: formData.placeName } : undefined,
    };
  };

  useEffect(() => {
    if (!eventId) {
      setError('Event ID is missing.');
      setIsLoading(false);
      return;
    }

    const fetchEventData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Event not found.');
          }
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch event. Status: ${response.status}`);
        }
        const data: ApiEventData = await response.json();
        setInitialEventData(transformApiToFormData(data));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        console.error('Error fetching event data:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [eventId]);

  const handleUpdateEvent = async (formData: EventFormData) => {
    if (!eventId) {
      setError('Event ID is missing for update.');
      return;
    }
    setIsLoading(true);
    setError(null);

    const apiData = transformFormDataForApi(formData);

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Auth header if needed
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update event. Status: ${response.status}`);
      }

      console.log('Event updated successfully');
      navigate('/dashboard'); // Or navigate to the event's detail page: `/events/${eventId}`
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error('Error updating event:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !initialEventData) {
    return <div className="container mx-auto p-4 text-center">Loading event data...</div>;
  }

  if (error && !initialEventData) { // Show error prominently if data couldn't be fetched
    return (
      <div className="container mx-auto p-4 max-w-2xl text-center">
        <p className="text-red-500 font-semibold">Error:</p>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!initialEventData) {
     // This case might occur if eventId is invalid early or some other non-error, non-loading state before data is set
    return <div className="container mx-auto p-4 text-center">No event data to display.</div>;
  }


  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Edit Event</h1>
        <p className="text-gray-600">
          Modify the details of the event or story below.
        </p>
      </header>

      {error && ( // For errors during submit, shown above the form
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded" role="alert">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <EventForm
        initialData={initialEventData}
        onSubmit={handleUpdateEvent}
        isLoading={isLoading}
        submitButtonText="Update Event"
      />
    </div>
  );
};

export default EditEventPage;
