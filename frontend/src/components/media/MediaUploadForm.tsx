import React, { useState } from 'react';
import { mediaService, ApiFile } from '../../services/api/mediaService'; // Import service and type
import { Button } from '../ui/Button'; // Assuming a Button component
import { Input } from '../ui/Input';   // Assuming an Input component
import { Textarea } from '../ui/Textarea'; // Assuming a Textarea component
import { Label } from '../ui/Label';     // Assuming a Label component
import { Loader2 } from 'lucide-react'; // For loading spinner

// Align FormData interface with ApiFile and backend expectations
interface MediaFormData {
  files: FileList | null;
  description: string;
  tags: string; // Comma-separated string
  category: 'photo' | 'video' | 'document' | 'audio' | 'other'; // Lowercase to match ApiFile
  privacy: 'private' | 'public' | 'family'; // Lowercase to match ApiFile
  familyTreeId?: string;
  relatedPersons?: string; // Comma-separated IDs
  relatedEvents?: string;  // Comma-separated IDs
}

interface MediaUploadFormProps {
  onUploadSuccess?: (uploadedFiles: ApiFile[]) => void; // Callback for successful upload
  // Add familyTreeId as a prop if the form is contextually within a tree
  // currentFamilyTreeId?: string;
}

const MediaUploadForm: React.FC<MediaUploadFormProps> = ({ onUploadSuccess }) => {
  const [formData, setFormData] = useState<MediaFormData>({
    files: null,
    description: '',
    tags: '',
    category: 'photo',
    privacy: 'private',
    familyTreeId: '', // Initialize with prop if available: currentFamilyTreeId || ''
    relatedPersons: '',
    relatedEvents: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    // Optionally clear previous success/error messages when new files are selected
    setSuccessMessage(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.files || formData.files.length === 0) {
      setError('Please select at least one file to upload.');
      return;
    }

    setIsLoading(true);
    const uploadedFilesResult: ApiFile[] = [];

    try {
      for (let i = 0; i < formData.files.length; i++) {
        const file = formData.files[i];
        const submissionData = new FormData();
        submissionData.append('file', file); // Backend expects 'file' for the file itself
        submissionData.append('description', formData.description);
        submissionData.append('tags', formData.tags); // Send as comma-separated string, backend can parse
        submissionData.append('category', formData.category);
        submissionData.append('privacy', formData.privacy);
        if (formData.familyTreeId) submissionData.append('familyTreeId', formData.familyTreeId);
        if (formData.relatedPersons) submissionData.append('relatedPersons', formData.relatedPersons); // Send as comma-separated string
        if (formData.relatedEvents) submissionData.append('relatedEvents', formData.relatedEvents);   // Send as comma-separated string

        // Add any other necessary fields expected by your backend for a single file upload
        // E.g. if userId needs to be explicitly set and backend doesn't get it from auth token for this endpoint
        // submissionData.append('userId', 'current_user_id_from_auth_context');


        const uploadedFile = await mediaService.uploadMedia(submissionData);
        uploadedFilesResult.push(uploadedFile);
      }

      setSuccessMessage(`${uploadedFilesResult.length} file(s) uploaded successfully!`);
      if (onUploadSuccess) {
        onUploadSuccess(uploadedFilesResult);
      }
      // Reset form (optional)
      setFormData({
        files: null, description: '', tags: '', category: 'photo', privacy: 'private',
        familyTreeId: formData.familyTreeId, // Keep familyTreeId if context-bound
        relatedPersons: '', relatedEvents: ''
      });
      // Clear file input visually (requires ref or more complex handling not shown here for brevity)
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'An error occurred during upload.');
      console.error('Upload error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white shadow-md rounded-lg">
      <div>
        <Label htmlFor="files">Upload Files</Label>
        <Input
          type="file"
          id="files"
          name="files"
          multiple
          onChange={handleFileChange}
          disabled={isLoading}
          className="mt-1 block w-full"
        />
         {formData.files && <p className="mt-1 text-xs text-gray-500">{formData.files.length} file(s) selected.</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          disabled={isLoading}
          className="mt-1 block w-full"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          disabled={isLoading}
          className="mt-1 block w-full"
        />
      </div>

      <div>
        <Label htmlFor="familyTreeId">Family Tree ID (Optional)</Label>
        <Input
          type="text"
          id="familyTreeId"
          name="familyTreeId"
          value={formData.familyTreeId}
          onChange={handleInputChange}
          disabled={isLoading}
          className="mt-1 block w-full"
          placeholder="Link to a specific family tree"
        />
      </div>

      <div>
        <Label htmlFor="relatedPersons">Related Persons (Optional, comma-separated IDs)</Label>
        <Input
          type="text"
          id="relatedPersons"
          name="relatedPersons"
          value={formData.relatedPersons}
          onChange={handleInputChange}
          disabled={isLoading}
          className="mt-1 block w-full"
          placeholder="e.g., personId1,personId2"
        />
      </div>

      <div>
        <Label htmlFor="relatedEvents">Related Events (Optional, comma-separated IDs)</Label>
        <Input
          type="text"
          id="relatedEvents"
          name="relatedEvents"
          value={formData.relatedEvents}
          onChange={handleInputChange}
          disabled={isLoading}
          className="mt-1 block w-full"
          placeholder="e.g., eventId1,eventId2"
        />
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            disabled={isLoading}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="photo">Photo</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="audio">Audio</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <Label htmlFor="privacy">Privacy</Label>
          <select
            id="privacy"
            name="privacy"
            value={formData.privacy}
            onChange={handleInputChange}
            disabled={isLoading}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
            <option value="family">Family Only</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

      <div>
        <Button
          type="submit"
          className="w-full flex justify-center items-center"
          isLoading={isLoading}
          disabled={isLoading}
          variant="primary"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload Media
        </Button>
      </div>
    </form>
  );
};

export default MediaUploadForm;
