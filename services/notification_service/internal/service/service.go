package service

import (
	"context"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/google/uuid"
)

type Service interface {
	Notify(ctx context.Context, req models.CreateNotificationRequest) error
	GetNotifications(ctx context.Context, userID uuid.UUID, page, limit int, unreadOnly bool) ([]models.Notification, int64, error)
	MarkAsRead(ctx context.Context, id uuid.UUID) error
	SendEmail(ctx context.Context, to, subject, body string) error
}

type EmailSender interface {
	Send(to, subject, body string) error
}
