package repository

import (
	"context"
	"log/slog"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
)

type compositeRepo struct {
	postgresRepo VerificationRepository
	neo4jRepo    VerificationRepository
}

// NewCompositeRepository creates a repository that writes to both Postgres and Neo4j.
func NewCompositeRepository(postgresRepo, neo4jRepo VerificationRepository) VerificationRepository {
	return &compositeRepo{
		postgresRepo: postgresRepo,
		neo4jRepo:    neo4jRepo,
	}
}

func (r *compositeRepo) CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	// Primary write to Postgres (Source of Truth)
	if err := r.postgresRepo.CreateSuggestion(ctx, suggestion); err != nil {
		return err
	}

	// Secondary best-effort write to Neo4j
	if err := r.neo4jRepo.CreateSuggestion(ctx, suggestion); err != nil {
		slog.Error("failed to sync suggestion creation to neo4j",
			slog.String("suggestion_id", suggestion.ID),
			slog.Any("error", err))
	}

	return nil
}

func (r *compositeRepo) UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	// Primary write to Postgres
	if err := r.postgresRepo.UpdateSuggestion(ctx, suggestion); err != nil {
		return err
	}

	// Secondary write to Neo4j
	if err := r.neo4jRepo.UpdateSuggestion(ctx, suggestion); err != nil {
		slog.Error("failed to sync suggestion update to neo4j",
			slog.String("suggestion_id", suggestion.ID),
			slog.Any("error", err))
	}

	return nil
}

func (r *compositeRepo) GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error) {
	// Read from Postgres only
	return r.postgresRepo.GetSuggestionByID(ctx, id)
}

func (r *compositeRepo) ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error) {
	// Read from Postgres only
	return r.postgresRepo.ListPendingSuggestions(ctx)
}
