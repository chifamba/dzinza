package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"gorm.io/gorm"
)

type ModerationRepository interface {
	FlagContent(ctx context.Context, flagged *models.FlaggedContent) error
	GetFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error)
	BanUser(ctx context.Context, ban *models.UserBan) error
}

type postgresRepo struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) ModerationRepository {
	return &postgresRepo{db: db}
}

func (r *postgresRepo) FlagContent(ctx context.Context, flagged *models.FlaggedContent) error {
	return r.db.WithContext(ctx).Create(flagged).Error
}

func (r *postgresRepo) GetFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error) {
	var results []models.FlaggedContent
	if err := r.db.WithContext(ctx).Find(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

func (r *postgresRepo) BanUser(ctx context.Context, ban *models.UserBan) error {
	return r.db.WithContext(ctx).Create(ban).Error
}
