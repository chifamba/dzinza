package repository

import (
	"context"
	"github.com/chifamba/dzinza/services/localization_service/internal/models"
	"gorm.io/gorm"
)

type Repository interface {
	GetTranslation(ctx context.Context, key, locale string) (*models.Translation, error)
	ListTranslations(ctx context.Context, locale string) ([]models.Translation, error)
	SaveTranslation(ctx context.Context, translation *models.Translation) error
	GetCulturalNamePattern(ctx context.Context, cultureCode string) (*models.CulturalNamePattern, error)
}

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) GetTranslation(ctx context.Context, key, locale string) (*models.Translation, error) {
	var t models.Translation
	err := r.db.WithContext(ctx).Where("key = ? AND locale = ?", key, locale).First(&t).Error
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *postgresRepository) ListTranslations(ctx context.Context, locale string) ([]models.Translation, error) {
	var translations []models.Translation
	err := r.db.WithContext(ctx).Where("locale = ?", locale).Find(&translations).Error
	return translations, err
}

func (r *postgresRepository) SaveTranslation(ctx context.Context, translation *models.Translation) error {
	return r.db.WithContext(ctx).Save(translation).Error
}

func (r *postgresRepository) GetCulturalNamePattern(ctx context.Context, cultureCode string) (*models.CulturalNamePattern, error) {
	var pattern models.CulturalNamePattern
	err := r.db.WithContext(ctx).Where("culture_code = ?", cultureCode).First(&pattern).Error
	if err != nil {
		return nil, err
	}
	return &pattern, nil
}
