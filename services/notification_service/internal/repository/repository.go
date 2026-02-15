package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, notification *models.Notification) error
	ListByUser(ctx context.Context, userID uuid.UUID, page, limit int, unreadOnly bool) ([]models.Notification, int64, error)
	MarkAsRead(ctx context.Context, id uuid.UUID) error
}
