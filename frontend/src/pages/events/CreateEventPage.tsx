import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventForm, EventFormData } from '../../components/events'; // Adjust path as needed

const CreateEventPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const transformFormDataForApi = (formData: EventFormData) => {
    return {
      ...formData, // relatedPersons is now string[] from EventForm
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      // relatedPersons: formData.relatedPersons.split(',').map(id => id.trim()).filter(id => id), // No longer needed
      associatedMediaIds: formData.associatedMediaIds.split(',').map(id => id.trim()).filter(id => id),
      // Ensure date fields are either valid ISO strings or undefined if empty
      date: formData.date || undefined,
      endDate: formData.endDate || undefined,
      familyTreeId: formData.familyTreeId || undefined,
      category: formData.category || undefined,
      place: formData.placeName ? { name: formData.placeName } : undefined, // API expects place as an object
    };
  };

  const handleCreateEvent = async (formData: EventFormData) => {
    setIsLoading(true);
    setError(null);

    const apiData = transformFormDataForApi(formData);

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization header with token would be needed if API is protected
          // For now, assuming session-based auth or a proxy handles it.
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to create event. Status: ${response.status}`);
      }

      // const createdEvent = await response.json(); // Optionally use the createdEvent data
      console.log('Event created successfully');
      navigate('/dashboard'); // Navigate to dashboard or a relevant page
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error('Error creating event:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Create New Event or Story</h1>
        <p className="text-gray-600">
          Fill in the details below to add a new event, story, or significant moment to your records.
        </p>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded" role="alert">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <EventForm
        onSubmit={handleCreateEvent}
        isLoading={isLoading}
        submitButtonText="Create Event"
      />
    </div>
  );
};

export default CreateEventPage;
