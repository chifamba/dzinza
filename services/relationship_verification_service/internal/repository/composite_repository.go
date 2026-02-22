package repository

import (
	"context"
	"log/slog"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
)

type compositeRepository struct {
	pgRepo    VerificationRepository
	neo4jRepo Neo4jRepository
}

// NewCompositeRepository creates a new composite repository.
func NewCompositeRepository(pgRepo VerificationRepository, neo4jRepo Neo4jRepository) VerificationRepository {
	return &compositeRepository{
		pgRepo:    pgRepo,
		neo4jRepo: neo4jRepo,
	}
}

func (r *compositeRepository) CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	// 1. Write to Postgres (Source of Truth)
	if err := r.pgRepo.CreateSuggestion(ctx, suggestion); err != nil {
		return err
	}

	// 2. Write to Neo4j (Best Effort)
	// We run this asynchronously to not block the response and to isolate failures.
	go func() {
		// Use background context to ensure execution continues even if request context is cancelled.
		if err := r.neo4jRepo.CreateSuggestion(context.Background(), suggestion); err != nil {
			slog.Error("failed to sync suggestion creation to neo4j",
				slog.String("suggestion_id", suggestion.ID),
				slog.Any("error", err))
		}
	}()

	return nil
}

func (r *compositeRepository) UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	// 1. Write to Postgres (Source of Truth)
	if err := r.pgRepo.UpdateSuggestion(ctx, suggestion); err != nil {
		return err
	}

	// 2. Write to Neo4j (Best Effort)
	go func() {
		if err := r.neo4jRepo.UpdateSuggestion(context.Background(), suggestion); err != nil {
			slog.Error("failed to sync suggestion update to neo4j",
				slog.String("suggestion_id", suggestion.ID),
				slog.Any("error", err))
		}
	}()

	return nil
}

func (r *compositeRepository) GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error) {
	return r.pgRepo.GetSuggestionByID(ctx, id)
}

func (r *compositeRepository) ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error) {
	return r.pgRepo.ListPendingSuggestions(ctx)
}
