import React, { useEffect } from 'react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

const Lightbox: React.FC<LightboxProps> = ({ isOpen, onClose, imageUrl }) => {
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity duration-300"
      onClick={onClose} // Close on backdrop click
    >
      <div
        className="relative bg-white p-4 rounded-lg shadow-xl max-w-3xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image container itself
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold z-10"
          aria-label="Close lightbox"
        >
          &times;
        </button>
        <img
          src={imageUrl}
          alt="Lightbox content"
          className="max-w-full max-h-[80vh] object-contain rounded"
        />
      </div>
    </div>
  );
};

export default Lightbox;
