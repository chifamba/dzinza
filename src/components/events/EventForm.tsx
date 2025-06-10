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
  const [personSearchTerm, setPersonSearchTerm] = useState<string>('');

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

  // useCallback for fetchPersons to stabilize its identity for useEffect dependencies
  const fetchPersons = React.useCallback(async (currentFamilyTreeId?: string, currentSearchTerm?: string) => {
    setPersonsLoading(true);
    setPersonsError(null);
    const queryParams = new URLSearchParams();
    if (currentFamilyTreeId) {
      queryParams.append('familyTreeId', currentFamilyTreeId);
    }
    if (currentSearchTerm && currentSearchTerm.trim()) {
      queryParams.append('search', currentSearchTerm.trim());
    }
    queryParams.append('limit', '30'); // Default limit for search results
    queryParams.append('page', '1'); // Always fetch first page for new search/filter context

    try {
      const response = await fetch(`/api/persons?${queryParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch persons' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data && Array.isArray(data.data)) {
        setAllPersons(data.data.map((p: any) => ({ id: p._id, name: `${p.firstName} ${p.lastName}`.trim() || 'Unnamed Person' })));
      } else {
        setAllPersons([]); // Ensure it's an array even if response is unexpected
        console.warn("Fetched persons data is not in expected array format or empty:", data);
      }
    } catch (err) {
      setPersonsError(err instanceof Error ? err.message : 'An unknown error occurred');
      setAllPersons([]); // Clear persons on error
    } finally {
      setPersonsLoading(false);
    }
  }, []); // No dependencies, relies on passed arguments

  // Effect for initial fetch and when familyTreeId changes (maintaining current search)
  useEffect(() => {
    fetchPersons(formData.familyTreeId, personSearchTerm);
  }, [formData.familyTreeId, fetchPersons]); // personSearchTerm is not added here to avoid loop with debounce; debounce effect handles search term changes.

  // Effect for debounced search when personSearchTerm changes
  useEffect(() => {
    const handler = setTimeout(() => {
      // Fetch only if search term is not empty or if it became empty (to reset list)
      // The initial load is handled by the effect above. This is for subsequent searches.
      // Or, always fetch to ensure context (familyTreeId) is applied with new search term.
      fetchPersons(formData.familyTreeId, personSearchTerm);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [personSearchTerm, formData.familyTreeId, fetchPersons]);


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
        <label htmlFor="personSearch" className="block text-sm font-medium text-gray-700">Search Related Persons</label>
        <Input
          type="text"
          id="personSearch"
          name="personSearch"
          value={personSearchTerm}
          onChange={(e) => setPersonSearchTerm(e.target.value)}
          placeholder="Type to search..."
          className="mt-1 mb-2"
        />
        {personsLoading && <p className="text-sm text-gray-500">Loading persons...</p>}
        {personsError && <p className="text-sm text-red-500">Error: {personsError}</p>}

        {!personsLoading && !personsError && allPersons.length === 0 && personSearchTerm && (
          <p className="text-sm text-gray-500 mt-2">No persons found matching "{personSearchTerm}".</p>
        )}
        {!personsLoading && !personsError && allPersons.length === 0 && !personSearchTerm && (
          <p className="text-sm text-gray-500 mt-2">No persons available. Try a different search or Family Tree ID.</p>
        )}

        {!personsLoading && !personsError && allPersons.length > 0 && (
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
            {allPersons.map(person => (
              <label key={person.id} className="flex items-center space-x-2 hover:bg-gray-50 p-1 rounded cursor-pointer">
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
