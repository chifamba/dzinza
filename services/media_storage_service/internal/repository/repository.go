package repository

import (
	"context"
	"io"

	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/google/uuid"
)

type MetadataRepository interface {
	Create(ctx context.Context, media *models.Media) error
	GetByID(ctx context.Context, id uuid.UUID) (*models.Media, error)
	Delete(ctx context.Context, id uuid.UUID) error
	ListByPerson(ctx context.Context, personID uuid.UUID) ([]models.Media, error)
}

type StorageRepository interface {
	Upload(ctx context.Context, key string, body io.Reader, contentType string) error
	GetPresignedURL(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
}
