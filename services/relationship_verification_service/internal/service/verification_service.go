package service

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/repository"
)

type VerificationService interface {
	ProposeChange(ctx context.Context, proposerID string, targetID string, changeType string, payload string) (*models.Suggestion, error)
	VerifySuggestion(ctx context.Context, verifierID string, suggestionID string, action string, comment string) error
}

type verificationService struct {
	repo repository.VerificationRepository
	// In a real app, we would have a client for trust service here
}

func NewVerificationService(repo repository.VerificationRepository) VerificationService {
	return &verificationService{
		repo: repo,
	}
}

func (s *verificationService) ProposeChange(ctx context.Context, proposerID string, targetID string, changeType string, payload string) (*models.Suggestion, error) {
	suggestion := &models.Suggestion{
		ID:         fmt.Sprintf("sug_%d", time.Now().UnixNano()),
		Type:       changeType,
		TargetID:   targetID,
		Payload:    payload,
		ProposerID: proposerID,
		Status:     models.StatusPending,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}

	if err := s.repo.CreateSuggestion(ctx, suggestion); err != nil {
		return nil, err
	}

	return suggestion, nil
}

func (s *verificationService) VerifySuggestion(ctx context.Context, verifierID string, suggestionID string, action string, comment string) error {
	suggestion, err := s.repo.GetSuggestionByID(ctx, suggestionID)
	if err != nil {
		return err
	}

	if suggestion.Status != models.StatusPending {
		return fmt.Errorf("suggestion is already decided")
	}

	// Simple logic for now: 2 confirmations to approve, 1 rejection to reject
	// In real app, this would use trust scores
	
	entry := models.AuditEntry{
		UserID:    verifierID,
		Action:    action,
		Comment:   comment,
		Timestamp: time.Now(),
	}
	
	// suggestion.AuditTrail = append(suggestion.AuditTrail, entry) 
	// Note: AuditTrail needs proper handling in DB (JSONB or separate table)
	_ = entry

	if action == "REJECT" {
		suggestion.Status = models.StatusRejected
	} else if action == "CONFIRM" {
		// Mock logic: immediately confirm for now
		suggestion.Status = models.StatusConfirmed
	}

	suggestion.UpdatedAt = time.Now()
	return s.repo.UpdateSuggestion(ctx, suggestion)
}
