import React, { useState, useEffect } from 'react';
import { Lightbox } from '../ui'; // Assuming index.ts in ../ui exports Lightbox

interface MediaFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  originalName: string;
  category: 'photo' | 'video' | 'document' | 'audio' | 'other'; // Match File.ts category
}

// This is the expected structure from your API's File model
interface ApiFile {
  _id: string;
  url: string;
  originalName: string;
  category: 'photo' | 'video' | 'document' | 'audio' | 'other'; // Match File.ts category
  mimeType: string;
  metadata: {
    thumbnails?: {
      small?: string;
      medium?: string;
      large?: string;
    };
    // other metadata properties
  };
  // other properties from IFile
}

interface ApiResponse {
  success: boolean;
  data: ApiFile[];
  meta?: { // Optional meta object based on your route
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const MediaGallery: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const handleMediaItemClick = (file: MediaFile) => {
    if (file.category === 'photo') {
      setSelectedImageUrl(file.url); // Use the full original URL for lightbox
      setLightboxOpen(true);
    } else if (file.category === 'video') {
      console.log('Video clicked:', file.originalName, file.url);
      // Future: Implement video player modal
    } else if (file.category === 'document') {
      const downloadUrl = `/api/files/${file.id}/download`;
      window.open(downloadUrl, '_blank');
      console.log('Document clicked, attempting download:', file.originalName, downloadUrl);
    }
    // Other categories can be handled here if needed
  };

  useEffect(() => {
    const fetchMedia = async () => {
      setLoading(true);
      setError(null);
      const fetchedFiles: MediaFile[] = [];

      try {
        // Fetch photos
        const photoResponse = await fetch('/api/files?category=photo');
        if (!photoResponse.ok) {
          throw new Error(`Failed to fetch photos: ${photoResponse.statusText}`);
        }
        const photoData: ApiResponse = await photoResponse.json();
        if (photoData.success && Array.isArray(photoData.data)) {
          const photos = photoData.data.map((file: ApiFile) => ({
            id: file._id,
            url: file.url,
            thumbnailUrl: file.metadata?.thumbnails?.small || file.metadata?.thumbnails?.medium || file.url,
            originalName: file.originalName,
            category: file.category,
          }));
          fetchedFiles.push(...photos);
        } else {
          console.warn('Photo data is not in expected format:', photoData);
        }

        // Fetch videos
        const videoResponse = await fetch('/api/files?category=video');
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch videos: ${videoResponse.statusText}`);
        }
        const videoData: ApiResponse = await videoResponse.json();
        if (videoData.success && Array.isArray(videoData.data)) {
          const videos = videoData.data.map((file: ApiFile) => ({
            id: file._id,
            url: file.url,
            thumbnailUrl: file.metadata?.thumbnails?.small || file.metadata?.thumbnails?.medium || file.url, // Videos might have poster images as thumbnails
            originalName: file.originalName,
            category: file.category,
          }));
          fetchedFiles.push(...videos);
        } else {
          console.warn('Video data is not in expected format:', videoData);
        }

        // Fetch documents
        const documentResponse = await fetch('/api/files?category=document');
        if (!documentResponse.ok) {
          throw new Error(`Failed to fetch documents: ${documentResponse.statusText}`);
        }
        const documentData: ApiResponse = await documentResponse.json();
        if (documentData.success && Array.isArray(documentData.data)) {
          const documents = documentData.data.map((file: ApiFile) => ({
            id: file._id,
            url: file.url,
            thumbnailUrl: file.metadata?.thumbnails?.small || file.metadata?.thumbnails?.medium || file.url, // Documents might not have relevant thumbnails
            originalName: file.originalName,
            category: file.category,
          }));
          fetchedFiles.push(...documents);
        } else {
          console.warn('Document data is not in expected format:', documentData);
        }

        setMediaFiles(fetchedFiles);
      } catch (err) {
        console.error('Error fetching media:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (loading) {
    return <div className="text-center p-4">Loading media...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  if (mediaFiles.length === 0) {
    return <div className="text-center p-4">No media files found.</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">Media Gallery</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {mediaFiles.map((file) => (
          <div
            key={file.id}
            className="border rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer"
            onClick={() => handleMediaItemClick(file)}
          >
            <img
              src={file.thumbnailUrl || file.url}
              alt={file.originalName}
              className="w-full h-48 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== file.url) {
                    target.src = file.url;
                }
                target.alt = `${file.originalName} (fallback image)`;
              }}
            />
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                {file.originalName}
              </h3>
              <p className="text-xs text-gray-500 capitalize">{file.category}</p>
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
            setSelectedImageUrl(null); // Clear selected image URL on close
          }}
        />
      )}
    </div>
  );
};

export default MediaGallery;
