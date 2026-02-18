package repository

import (
	"context"
	"log/slog"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
)

type compositeRepo struct {
	postgresRepo VerificationRepository
	neo4jRepo    Neo4jRepository
}

// NewCompositeRepository creates a new repository that writes to both Postgres and Neo4j.
func NewCompositeRepository(postgresRepo VerificationRepository, neo4jRepo Neo4jRepository) VerificationRepository {
	return &compositeRepo{
		postgresRepo: postgresRepo,
		neo4jRepo:    neo4jRepo,
	}
}

func (r *compositeRepo) CreateSuggestion(ctx context.Context, s *models.Suggestion) error {
	// Write to Postgres (Source of Truth)
	if err := r.postgresRepo.CreateSuggestion(ctx, s); err != nil {
		return err
	}

	// Write to Neo4j (Best Effort/Dual Write)
	if err := r.neo4jRepo.CreateSuggestion(ctx, s); err != nil {
		slog.Error("Failed to create suggestion in Neo4j", "error", err, "suggestion_id", s.ID)
		// We don't fail the request if Neo4j fails, but we log it.
		// In a production system, we might want to queue this for retry.
	}

	return nil
}

func (r *compositeRepo) GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error) {
	return r.postgresRepo.GetSuggestionByID(ctx, id)
}

func (r *compositeRepo) UpdateSuggestion(ctx context.Context, s *models.Suggestion) error {
	if err := r.postgresRepo.UpdateSuggestion(ctx, s); err != nil {
		return err
	}

	if err := r.neo4jRepo.UpdateSuggestion(ctx, s); err != nil {
		slog.Error("Failed to update suggestion in Neo4j", "error", err, "suggestion_id", s.ID)
	}

	return nil
}

func (r *compositeRepo) ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error) {
	return r.postgresRepo.ListPendingSuggestions(ctx)
}
