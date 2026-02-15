package service

import (
	"context"

	"github.com/chifamba/dzinza/services/help_support_service/internal/models"
	"github.com/chifamba/dzinza/services/help_support_service/internal/repository"
)

type HelpService interface {
	CreateTicket(ctx context.Context, userID, subject, desc, category string) (*models.Ticket, error)
	GetTicket(ctx context.Context, id string) (*models.Ticket, error)
	ListUserTickets(ctx context.Context, userID string) ([]models.Ticket, error)
	ReplyToTicket(ctx context.Context, ticketID, senderID, content string) error
}

type helpService struct {
	repo repository.Repository
}

func NewHelpService(repo repository.Repository) HelpService {
	return &helpService{repo: repo}
}

func (s *helpService) CreateTicket(ctx context.Context, userID, subject, desc, category string) (*models.Ticket, error) {
	ticket := &models.Ticket{
		UserID:      userID,
		Subject:     subject,
		Description: desc,
		Category:    category,
		Status:      "OPEN",
		Priority:    "MEDIUM",
	}
	err := s.repo.CreateTicket(ctx, ticket)
	return ticket, err
}

func (s *helpService) GetTicket(ctx context.Context, id string) (*models.Ticket, error) {
	return s.repo.GetTicket(ctx, id)
}

func (s *helpService) ListUserTickets(ctx context.Context, userID string) ([]models.Ticket, error) {
	return s.repo.ListTickets(ctx, userID)
}

func (s *helpService) ReplyToTicket(ctx context.Context, ticketID, senderID, content string) error {
	msg := models.Message{
		SenderID: senderID,
		Content:  content,
	}
	return s.repo.AddMessage(ctx, ticketID, msg)
}
