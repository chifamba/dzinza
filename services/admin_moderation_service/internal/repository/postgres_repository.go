package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"gorm.io/gorm"
)

// ModerationRepository defines the interface for moderation data access.
type ModerationRepository interface {
	CreateFlaggedContent(ctx context.Context, flagged *models.FlaggedContent) error
	GetFlaggedContentByID(ctx context.Context, id string) (*models.FlaggedContent, error)
	UpdateFlaggedContent(ctx context.Context, flagged *models.FlaggedContent) error
	ListFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error)
	ListByStatus(ctx context.Context, statuses ...string) ([]models.FlaggedContent, error)
	CreateBan(ctx context.Context, ban *models.UserBan) error
}

type postgresRepo struct {
	db *gorm.DB
}

// NewPostgresRepository creates a new moderation repository with PostgreSQL.
func NewPostgresRepository(db *gorm.DB) ModerationRepository {
	return &postgresRepo{db: db}
}

func (r *postgresRepo) CreateFlaggedContent(ctx context.Context, flagged *models.FlaggedContent) error {
	return r.db.WithContext(ctx).Create(flagged).Error
}

func (r *postgresRepo) GetFlaggedContentByID(ctx context.Context, id string) (*models.FlaggedContent, error) {
	var result models.FlaggedContent
	if err := r.db.WithContext(ctx).First(&result, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &result, nil
}

func (r *postgresRepo) UpdateFlaggedContent(ctx context.Context, flagged *models.FlaggedContent) error {
	return r.db.WithContext(ctx).Save(flagged).Error
}

func (r *postgresRepo) ListFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error) {
	var results []models.FlaggedContent
	if err := r.db.WithContext(ctx).Order("created_at DESC").Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *postgresRepo) ListByStatus(ctx context.Context, statuses ...string) ([]models.FlaggedContent, error) {
	var results []models.FlaggedContent
	if err := r.db.WithContext(ctx).Where("status IN ?", statuses).Order("ai_score DESC").Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *postgresRepo) CreateBan(ctx context.Context, ban *models.UserBan) error {
	return r.db.WithContext(ctx).Create(ban).Error
}
