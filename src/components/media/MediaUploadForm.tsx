import React, { useState } from 'react';

interface FormData {
  files: FileList | null;
  description: string;
  tags: string;
  category: 'Photo' | 'Video' | 'Document' | 'Audio' | 'Other';
  privacy: 'Private' | 'Public' | 'Family';
  familyTreeId?: string;
  relatedPersons?: string; // Comma-separated IDs
  relatedEvents?: string;  // Comma-separated IDs
}

const MediaUploadForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    files: null,
    description: '',
    tags: '',
    category: 'Photo',
    privacy: 'Private',
    familyTreeId: '',
    relatedPersons: '',
    relatedEvents: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prevData) => ({
      ...prevData,
      files: e.target.files,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Placeholder: Log form data to console
    console.log('Form Data:', {
      files: formData.files ? Array.from(formData.files).map(file => file.name) : [],
      description: formData.description,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      category: formData.category,
      privacy: formData.privacy,
      familyTreeId: formData.familyTreeId || null,
      relatedPersons: formData.relatedPersons?.split(',').map(id => id.trim()).filter(id => id) || [],
      relatedEvents: formData.relatedEvents?.split(',').map(id => id.trim()).filter(id => id) || [],
    });
    // Here you would typically send the data to a backend API
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white shadow-md rounded-lg">
      <div>
        <label htmlFor="files" className="block text-sm font-medium text-gray-700">
          Upload Files
        </label>
        <input
          type="file"
          id="files"
          name="files"
          multiple
          onChange={handleFileChange}
          className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="familyTreeId" className="block text-sm font-medium text-gray-700">
          Family Tree ID (Optional)
        </label>
        <input
          type="text"
          id="familyTreeId"
          name="familyTreeId"
          value={formData.familyTreeId}
          onChange={handleInputChange}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter Family Tree ID"
        />
      </div>

      <div>
        <label htmlFor="relatedPersons" className="block text-sm font-medium text-gray-700">
          Related Persons (Optional, comma-separated IDs)
        </label>
        <input
          type="text"
          id="relatedPersons"
          name="relatedPersons"
          value={formData.relatedPersons}
          onChange={handleInputChange}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., personId1,personId2"
        />
      </div>

      <div>
        <label htmlFor="relatedEvents" className="block text-sm font-medium text-gray-700">
          Related Events (Optional, comma-separated IDs)
        </label>
        <input
          type="text"
          id="relatedEvents"
          name="relatedEvents"
          value={formData.relatedEvents}
          onChange={handleInputChange}
          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          placeholder="e.g., eventId1,eventId2"
        />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleInputChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option>Photo</option>
          <option>Video</option>
          <option>Document</option>
          <option>Audio</option>
          <option>Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="privacy" className="block text-sm font-medium text-gray-700">
          Privacy
        </label>
        <select
          id="privacy"
          name="privacy"
          value={formData.privacy}
          onChange={handleInputChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
        >
          <option>Private</option>
          <option>Public</option>
          <option>Family</option>
        </select>
      </div>

      <div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Upload Media
        </button>
      </div>
    </form>
  );
};

export default MediaUploadForm;
