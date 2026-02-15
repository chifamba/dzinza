package service

import (
	"context"
	"io"

	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/google/uuid"
)

type Service interface {
	UploadMedia(ctx context.Context, userID, personID uuid.UUID, filename, contentType string, size int64, body io.Reader) (*models.Media, error)
	GetMediaURL(ctx context.Context, id uuid.UUID) (string, error)
	DeleteMedia(ctx context.Context, id uuid.UUID) error
	ListPersonMedia(ctx context.Context, personID uuid.UUID) ([]models.Media, error)
}
