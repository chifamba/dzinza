package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"gorm.io/gorm"
)

type postgresRepo struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) VerificationRepository {
	return &postgresRepo{db: db}
}

func (r *postgresRepo) CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	return r.db.WithContext(ctx).Create(suggestion).Error
}

func (r *postgresRepo) GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error) {
	var suggestion models.Suggestion
	if err := r.db.WithContext(ctx).First(&suggestion, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &suggestion, nil
}

func (r *postgresRepo) UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	return r.db.WithContext(ctx).Save(suggestion).Error
}

func (r *postgresRepo) ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error) {
	var suggestions []models.Suggestion
	if err := r.db.WithContext(ctx).Find(&suggestions, "status = ?", models.StatusPending).Error; err != nil {
		return nil, err
	}
	return suggestions, nil
}
