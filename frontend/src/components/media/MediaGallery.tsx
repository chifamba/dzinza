import React, { useState, useEffect, useCallback } from 'react';
import { mediaService, ApiFile, UpdateMediaMetadataPayload } from '../../services/api/mediaService'; // Import service and types
import { Lightbox } from '../ui';
import { Button } from '../ui/Button'; // Assuming Button component
import EditMediaModal from './EditMediaModal'; // Import the new modal
import { Edit3, Download, Loader2, AlertTriangle } from 'lucide-react'; // Icons

// Using ApiFile directly as the primary type for media items
// interface MediaFile { // This can be removed if ApiFile is used directly
//   id: string; // _id from ApiFile
//   url: string;
//   thumbnailUrl?: string;
//   originalName: string;
//   category: ApiFile['category'];
// }


const MediaGallery: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<ApiFile[]>([]); // Use ApiFile type
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  // State for Edit Media Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedMediaForEdit, setSelectedMediaForEdit] = useState<ApiFile | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false); // For loading full details before edit

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Example: Fetch all categories or specific ones as needed
      // For simplicity, fetching all and then can be filtered on client or by API param
      const response = await mediaService.listMedia({ limit: 50 }); // Adjust params as needed
      if (response.data) {
        setMediaFiles(response.data);
      } else {
        setMediaFiles([]);
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleMediaItemClick = (file: ApiFile) => {
    if (file.category === 'photo') {
      setSelectedImageUrl(file.url);
      setLightboxOpen(true);
    } else if (file.category === 'video') {
      // Implement video player modal or direct link
      window.open(file.url, '_blank');
    } else if (file.category === 'document' || file.category === 'audio' || file.category === 'other') {
      // For documents/audio/other, provide a download link or open in new tab
      // Assuming backend provides a direct download mechanism or pre-signed URL for these
      window.open(file.url, '_blank');
    }
  };

  const handleEditClick = async (event: React.MouseEvent, file: ApiFile) => {
    event.stopPropagation(); // Prevent triggering handleMediaItemClick
    setDetailLoading(true);
    setEditError(null);
    try {
        // Fetch full details for the item to be edited
        const fullMediaDetails = await mediaService.getMediaDetails(file._id);
        setSelectedMediaForEdit(fullMediaDetails);
        setIsEditModalOpen(true);
    } catch (err) {
        setEditError(err instanceof Error ? err.message : 'Failed to load media details for editing.');
    } finally {
        setDetailLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    if (!editLoading) {
      setIsEditModalOpen(false);
      setSelectedMediaForEdit(null);
    }
  };

  const handleSaveMediaMetadata = async (mediaId: string, metadata: UpdateMediaMetadataPayload) => {
    setEditLoading(true);
    setEditError(null);
    try {
      const updatedMediaItem = await mediaService.updateMediaMetadata(mediaId, metadata);
      // Update the specific item in the local state for immediate UI feedback
      setMediaFiles(prevFiles =>
        prevFiles.map(file => file._id === mediaId ? { ...file, ...updatedMediaItem } : file)
      );
      setIsEditModalOpen(false);
      setSelectedMediaForEdit(null);
      // Optionally show a success toast/notification
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update media metadata.');
      // Error will be displayed in the modal by EditMediaModal component
      throw err; // Re-throw to let EditMediaModal know saving failed
    } finally {
      setEditLoading(false);
    }
  };


  if (loading) {
    return <div className="text-center p-4 flex justify-center items-center min-h-[200px]"><Loader2 className="h-8 w-8 animate-spin text-dzinza-500"/></div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500 flex flex-col items-center justify-center min-h-[200px]">
        <AlertTriangle className="h-10 w-10 mb-2"/> Error: {error}
    </div>;
  }

  if (mediaFiles.length === 0) {
    return <div className="text-center p-4">No media files found. Upload some!</div>;
  }

  const getThumbnailUrl = (file: ApiFile): string => {
    if (file.category === 'photo' && file.thumbnails && file.thumbnails.length > 0) {
      const smallThumb = file.thumbnails.find(t => t.size === 'small' || t.size === 'medium');
      if (smallThumb) return smallThumb.url;
    }
    // Fallback or placeholder for other types
    // For actual documents/videos, you might have specific placeholder images based on mimeType
    return file.url; // Or a generic icon URL
  };


  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Media Gallery</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {mediaFiles.map((file) => (
          <div
            key={file._id}
            className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group relative"
          >
            <div
              className="w-full h-48 bg-gray-200 flex items-center justify-center cursor-pointer"
              onClick={() => handleMediaItemClick(file)}
            >
              {file.category === 'photo' ? (
                <img
                  src={getThumbnailUrl(file)}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== file.url) target.src = file.url; // Try full URL if thumb fails
                    target.alt = `${file.originalName} (fallback)`;
                  }}
                />
              ) : (
                <span className="text-gray-500 text-sm p-2 text-center">{file.category} - Click to view/download</span>
                // TODO: Add icons for different file types
              )}
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-xs text-gray-500 capitalize">{file.category}</p>
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
              <Button
                size="icon"
                variant="outline"
                className="bg-white bg-opacity-75 hover:bg-opacity-100 p-1.5"
                onClick={(e) => handleEditClick(e, file)}
                aria-label="Edit media"
                disabled={detailLoading && selectedMediaForEdit?._id === file._id}
              >
                {detailLoading && selectedMediaForEdit?._id === file._id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Edit3 className="h-4 w-4" />}
              </Button>
              {/* Add download button or other actions if needed */}
            </div>
          </div>
        ))}
      </div>
      {selectedImageUrl && (
        <Lightbox
          isOpen={lightboxOpen}
          imageUrl={selectedImageUrl}
          onClose={() => {
            setLightboxOpen(false);
            setSelectedImageUrl(null);
          }}
        />
      )}
      {isEditModalOpen && selectedMediaForEdit && (
        <EditMediaModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          mediaItem={selectedMediaForEdit}
          onSave={handleSaveMediaMetadata}
          isLoading={editLoading}
          error={editError}
        />
      )}
    </div>
  );
};

export default MediaGallery;
