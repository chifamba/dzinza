package service

import (
	"context"
	"log/slog"
	"time"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/chifamba/dzinza/services/notification_service/internal/repository"
	"github.com/google/uuid"
)

type notificationService struct {
	repo        repository.Repository
	emailSender EmailSender
}

func NewNotificationService(repo repository.Repository, emailSender EmailSender) Service {
	return &notificationService{
		repo:        repo,
		emailSender: emailSender,
	}
}

func (s *notificationService) Notify(ctx context.Context, req models.CreateNotificationRequest) error {
	slog.Info("creating notification", "user_id", req.UserID, "type", req.Type)
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return err
	}

	n := &models.Notification{
		UserID:    userID,
		Type:      req.Type,
		Title:     req.Title,
		Message:   req.Message,
		CreatedAt: time.Now(),
	}

	return s.repo.Create(ctx, n)
}

func (s *notificationService) GetNotifications(ctx context.Context, userID uuid.UUID, page, limit int, unreadOnly bool) ([]models.Notification, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	return s.repo.ListByUser(ctx, userID, page, limit, unreadOnly)
}

func (s *notificationService) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	return s.repo.MarkAsRead(ctx, id)
}

func (s *notificationService) SendEmail(ctx context.Context, to, subject, body string) error {
	return s.emailSender.Send(to, subject, body)
}
