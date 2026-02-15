package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	"image/jpeg"
	_ "image/png"
	"io"
	"time"

	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/chifamba/dzinza/services/media_storage_service/internal/repository"
	"github.com/dsoprea/go-exif/v3"
	"github.com/google/uuid"
	"github.com/nfnt/resize"
	"gorm.io/datatypes"
)

type mediaService struct {
	metaRepo    repository.MetadataRepository
	storageRepo repository.StorageRepository
	cdnBaseURL  string
}

func NewMediaService(metaRepo repository.MetadataRepository, storageRepo repository.StorageRepository, cdnBaseURL string) Service {
	return &mediaService{
		metaRepo:    metaRepo,
		storageRepo: storageRepo,
		cdnBaseURL:  cdnBaseURL,
	}
}

func (s *mediaService) UploadMedia(ctx context.Context, userID, personID uuid.UUID, filename, contentType string, size int64, body io.Reader) (*models.Media, error) {
	// Read body into buffer for multiple uses (EXIF extraction and S3 upload)
	data, err := io.ReadAll(body)
	if err != nil {
		return nil, err
	}

	metadata := make(map[string]interface{})
	metadata["mime_type"] = contentType
	metadata["size"] = size

	// Extract EXIF if it's an image
	if contentType == "image/jpeg" || contentType == "image/tiff" {
		if exifData, err := extractExif(data); err == nil {
			metadata["exif"] = exifData
		}
	}

	mediaID := uuid.New()
	s3Key := fmt.Sprintf("%s/%s", personID.String(), mediaID.String())

	// Generate thumbnail for images
	if contentType == "image/jpeg" || contentType == "image/png" {
		thumbData, err := generateThumbnail(data)
		if err == nil {
			thumbKey := fmt.Sprintf("%s/thumb_%s", personID.String(), mediaID.String())
			if err := s.storageRepo.Upload(ctx, thumbKey, bytes.NewReader(thumbData), "image/jpeg"); err == nil {
				metadata["has_thumbnail"] = true
				metadata["thumbnail_key"] = thumbKey
			}
		}
	}

	metadataJSON, _ := json.Marshal(metadata)

	// Upload to S3
	if err := s.storageRepo.Upload(ctx, s3Key, bytes.NewReader(data), contentType); err != nil {
		return nil, err
	}

	media := &models.Media{
		ID:          mediaID,
		UserID:      userID,
		PersonID:    personID,
		Filename:    filename,
		ContentType: contentType,
		Size:        size,
		S3Key:       s3Key,
		Metadata:    datatypes.JSON(metadataJSON),
		CreatedAt:   time.Now(),
	}

	if err := s.metaRepo.Create(ctx, media); err != nil {
		// Rollback S3 upload if DB fails
		_ = s.storageRepo.Delete(ctx, s3Key)
		return nil, err
	}

	return media, nil
}

func (s *mediaService) GetMediaURL(ctx context.Context, id uuid.UUID) (string, error) {
	media, err := s.metaRepo.GetByID(ctx, id)
	if err != nil {
		return "", err
	}

	if s.cdnBaseURL != "" {
		return fmt.Sprintf("%s/%s", s.cdnBaseURL, media.S3Key), nil
	}

	return s.storageRepo.GetPresignedURL(ctx, media.S3Key)
}

func (s *mediaService) DeleteMedia(ctx context.Context, id uuid.UUID) error {
	media, err := s.metaRepo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := s.storageRepo.Delete(ctx, media.S3Key); err != nil {
		return err
	}

	return s.metaRepo.Delete(ctx, id)
}

func (s *mediaService) ListPersonMedia(ctx context.Context, personID uuid.UUID) ([]models.Media, error) {
	return s.metaRepo.ListByPerson(ctx, personID)
}

func extractExif(data []byte) (map[string]interface{}, error) {
	rawExif, err := exif.SearchAndExtractExif(data)
	if err != nil {
		return nil, err
	}

	entries, _, err := exif.GetFlatExifData(rawExif, nil)
	if err != nil {
		return nil, err
	}

	metadata := make(map[string]interface{})
	for _, entry := range entries {
		if entry.TagName != "" {
			metadata[entry.TagName] = entry.Value
		}
	}

	return metadata, nil
}

func generateThumbnail(data []byte) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	// Resize to width 200px, preserve aspect ratio
	thumb := resize.Resize(200, 0, img, resize.Lanczos3)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, thumb, nil); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}
