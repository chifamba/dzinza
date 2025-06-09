import React, { useState, useEffect } from 'react';
import { RichTextEditor } from '../ui/RichTextEditor';
import { Input } from '../ui/Input'; // Assuming Input component is structured like this
import { Button } from '../ui/Button'; // Assuming Button component is structured like this

// Matches editable fields of IEvent, with array fields as comma-separated strings for form input
export interface EventFormData {
  title: string;
  content: string; // HTML content from RichTextEditor
  date?: string; // ISO string or empty
  endDate?: string; // ISO string or empty
  placeName?: string; // For place.name
  // placeLatitude?: number; // Future: add these if needed
  // placeLongitude?: number; // Future: add these if needed
  // placeAddress?: string; // Future: add these if needed
  category?: string;
  tags: string; // Comma-separated for input, but could be string[] if a tag component is used
  privacy: 'public' | 'private' | 'family';
  familyTreeId?: string;
  relatedPersons: string[]; // Now an array of person IDs
  associatedMediaIds: string; // Comma-separated IDs - unchanged for this task
}

interface Person {
  id: string;
  name: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData & { relatedPersons: string | string[] }>; // Accept string or array for initial relatedPersons
  onSubmit: (formData: EventFormData) => void;
  isLoading?: boolean;
  submitButtonText?: string;
}

const EventForm: React.FC<EventFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = 'Submit',
}) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    content: '',
    date: '',
    endDate: '',
    placeName: '',
    category: '',
    tags: '',
    privacy: 'private',
    familyTreeId: '',
    relatedPersons: [], // Initialize as empty array
    associatedMediaIds: '',
  });

  const [allPersons, setAllPersons] = useState<Person[]>([]);
  const [personsLoading, setPersonsLoading] = useState<boolean>(false);
  const [personsError, setPersonsError] = useState<string | null>(null);
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);

  // Initialize form data and selected persons from initialData
  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        content: initialData.content || '',
        date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
        endDate: initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '',
        placeName: initialData.placeName || '',
        category: initialData.category || '',
        tags: initialData.tags || '',
        privacy: initialData.privacy || 'private',
        familyTreeId: initialData.familyTreeId || '',
        relatedPersons: [], // This will be populated by selectedPersonIds
        associatedMediaIds: initialData.associatedMediaIds || '',
      });

      let initialSelectedIds: string[] = [];
      if (typeof initialData.relatedPersons === 'string') {
        initialSelectedIds = initialData.relatedPersons.split(',').map(id => id.trim()).filter(Boolean);
      } else if (Array.isArray(initialData.relatedPersons)) {
        initialSelectedIds = initialData.relatedPersons;
      }
      setSelectedPersonIds(initialSelectedIds);
    }
  }, [initialData]);

  // Fetch persons for selection
  useEffect(() => {
    const fetchPersons = async () => {
      setPersonsLoading(true);
      setPersonsError(null);
      try {
        // TODO: Adjust API endpoint if filtering by familyTreeId or other criteria is needed/possible
        const response = await fetch('/api/persons'); // Assuming this fetches all persons for the user
        if (!response.ok) {
          throw new Error('Failed to fetch persons');
        }
        const data = await response.json();
        // API response for persons is an object with a 'data' property which is an array
        if (data && Array.isArray(data.data)) {
             setAllPersons(data.data.map((p: any) => ({ id: p._id, name: `${p.firstName} ${p.lastName}`.trim() || 'Unnamed Person' })));
        } else if (Array.isArray(data)) { // Fallback if API returns array directly
             setAllPersons(data.map((p: any) => ({ id: p._id, name: `${p.firstName} ${p.lastName}`.trim() || 'Unnamed Person' })));
        } else {
            setAllPersons([]);
            console.warn("Fetched persons data is not in expected array format:", data);
        }

      } catch (err) {
        setPersonsError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setPersonsLoading(false);
      }
    };
    fetchPersons();
  }, []);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (value: string) => {
    setFormData((prev) => ({ ...prev, content: value }));
  };

  const handlePersonSelectionChange = (personId: string) => {
    setSelectedPersonIds(prevSelectedIds =>
      prevSelectedIds.includes(personId)
        ? prevSelectedIds.filter(id => id !== personId)
        : [...prevSelectedIds, personId]
    );
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      relatedPersons: selectedPersonIds, // Pass the array of selected IDs
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white shadow-md rounded-lg">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title*</label>
        <Input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          required
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content*</label>
        <RichTextEditor
          value={formData.content}
          onChange={handleContentChange}
        />
        {/* Hidden input to ensure RichTextEditor content is part of form submission if needed by some patterns, though we handle state directly */}
        {/* <input type="hidden" name="content" value={formData.content} /> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <Input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="mt-1"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
          <Input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleInputChange}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label htmlFor="placeName" className="block text-sm font-medium text-gray-700">Place Name (Optional)</label>
        <Input
          type="text"
          id="placeName"
          name="placeName"
          value={formData.placeName}
          onChange={handleInputChange}
          className="mt-1"
          placeholder="e.g., St. Mary's Hospital, London"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category (Optional)</label>
        <Input
          type="text"
          id="category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          className="mt-1"
          placeholder="e.g., Birth, Marriage, Story, Personal Achievement"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">Tags (Optional, comma-separated)</label>
        <Input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          className="mt-1"
          placeholder="e.g., graduation, wwii, journal"
        />
      </div>

      <div>
        <label htmlFor="privacy" className="block text-sm font-medium text-gray-700">Privacy</label>
        <select
          id="privacy"
          name="privacy"
          value={formData.privacy}
          onChange={handleInputChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="private">Private</option>
          <option value="family">Family</option>
          <option value="public">Public</option>
        </select>
      </div>

      <div>
        <label htmlFor="familyTreeId" className="block text-sm font-medium text-gray-700">Family Tree ID (Optional)</label>
        <Input
          type="text"
          id="familyTreeId"
          name="familyTreeId"
          value={formData.familyTreeId}
          onChange={handleInputChange}
          className="mt-1"
          placeholder="ID of the family tree this event belongs to"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Related Persons (Optional)</label>
        {personsLoading && <p className="text-sm text-gray-500">Loading persons...</p>}
        {personsError && <p className="text-sm text-red-500">Error loading persons: {personsError}</p>}
        {!personsLoading && !personsError && allPersons.length === 0 && <p className="text-sm text-gray-500">No persons available to select.</p>}
        {!personsLoading && !personsError && allPersons.length > 0 && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
            {allPersons.map(person => (
              <label key={person.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded">
                <input
                  type="checkbox"
                  value={person.id}
                  checked={selectedPersonIds.includes(person.id)}
                  onChange={() => handlePersonSelectionChange(person.id)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{person.name} ({person.id.substring(0,6)}...)</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="associatedMediaIds" className="block text-sm font-medium text-gray-700">Associated Media (Optional, comma-separated Media IDs)</label>
        <Input
          type="text"
          id="associatedMediaIds"
          name="associatedMediaIds"
          value={formData.associatedMediaIds}
          onChange={handleInputChange}
          className="mt-1"
          placeholder="e.g., mediaId1,mediaId2"
        />
      </div>

      <div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Submitting...' : submitButtonText}
        </Button>
      </div>
    </form>
  );
};

export default EventForm;
