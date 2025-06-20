import React, { useState, useEffect } from 'react';
import { ApiFile, UpdateMediaMetadataPayload } from '../../services/api/mediaService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { Loader2 } from 'lucide-react';

interface EditMediaModalProps {
  mediaItem: ApiFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (mediaId: string, data: UpdateMediaMetadataPayload) => Promise<void>;
  isLoading: boolean; // External loading state for the save operation
  error: string | null;   // External error state for the save operation
}

const EditMediaModal: React.FC<EditMediaModalProps> = ({
  mediaItem,
  isOpen,
  onClose,
  onSave,
  isLoading,
  error,
}) => {
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState(''); // Comma-separated string
  const [familyTreeId, setFamilyTreeId] = useState('');
  const [relatedPersons, setRelatedPersons] = useState(''); // Comma-separated IDs
  const [relatedEvents, setRelatedEvents] = useState('');   // Comma-separated IDs
  const [privacy, setPrivacy] = useState<ApiFile['privacy']>('private');
  const [category, setCategory] = useState<ApiFile['category']>('other');


  useEffect(() => {
    if (mediaItem) {
      setDescription(mediaItem.metadata?.description || '');
      setTags(mediaItem.tags?.join(', ') || '');
      setFamilyTreeId(mediaItem.familyTreeId || '');
      setRelatedPersons(mediaItem.relatedPersons?.join(', ') || '');
      setRelatedEvents(mediaItem.relatedEvents?.join(', ') || '');
      setPrivacy(mediaItem.privacy || 'private');
      setCategory(mediaItem.category || 'other');
    }
  }, [mediaItem]);

  if (!isOpen || !mediaItem) {
    return null;
  }

  const handleSave = async () => {
    const updatedData: UpdateMediaMetadataPayload = {
      description: description.trim() === '' ? undefined : description.trim(),
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      familyTreeId: familyTreeId.trim() === '' ? undefined : familyTreeId.trim(),
      relatedPersons: relatedPersons.split(',').map(id => id.trim()).filter(id => id),
      relatedEvents: relatedEvents.split(',').map(id => id.trim()).filter(id => id),
      privacy,
      category,
    };
    await onSave(mediaItem._id, updatedData);
  };

  const getPreviewElement = () => {
    if (mediaItem.mimeType.startsWith('image/')) {
      return <img src={mediaItem.url} alt={mediaItem.originalName} className="max-h-48 w-auto mx-auto rounded mb-4" />;
    }
    // Add icons for other file types
    if (mediaItem.mimeType.startsWith('video/')) return <p className="text-center p-4">🎬 Video Preview</p>;
    if (mediaItem.mimeType.startsWith('audio/')) return <p className="text-center p-4">🎵 Audio Preview</p>;
    if (mediaItem.mimeType === 'application/pdf') return <p className="text-center p-4">📄 PDF Document</p>;
    return <p className="text-center p-4">ℹ️ File Preview ({mediaItem.mimeType})</p>;
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit: ${mediaItem.originalName}`}>
      <div className="space-y-4 p-1"> {/* Reduced padding if Modal has its own */}
        {getPreviewElement()}

        <div>
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
          <Input
            id="edit-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="edit-familyTreeId">Family Tree ID (Optional)</Label>
          <Input
            id="edit-familyTreeId"
            type="text"
            value={familyTreeId}
            onChange={(e) => setFamilyTreeId(e.target.value)}
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="edit-relatedPersons">Related Persons (comma-separated IDs)</Label>
          <Input
            id="edit-relatedPersons"
            type="text"
            value={relatedPersons}
            onChange={(e) => setRelatedPersons(e.target.value)}
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="edit-relatedEvents">Related Events (comma-separated IDs)</Label>
          <Input
            id="edit-relatedEvents"
            type="text"
            value={relatedEvents}
            onChange={(e) => setRelatedEvents(e.target.value)}
            className="mt-1 block w-full"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ApiFile['category'])}
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
              <Label htmlFor="edit-privacy">Privacy</Label>
              <select
                id="edit-privacy"
                name="privacy"
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value as ApiFile['privacy'])}
                disabled={isLoading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-dzinza-500 focus:border-dzinza-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="family">Family Only</option>
              </select>
            </div>
        </div>


        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isLoading} disabled={isLoading} variant="primary">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EditMediaModal;
