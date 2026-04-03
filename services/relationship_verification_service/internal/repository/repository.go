package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
)

type VerificationRepository interface {
	CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
	GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error)
	UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
	ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error)
}

type Neo4jRepository interface {
	CreateSuggestionNode(ctx context.Context, suggestion *models.Suggestion) error
	UpdateSuggestionStatus(ctx context.Context, suggestionID string, status models.SuggestionStatus, verifierID string) error
}
