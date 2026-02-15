package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/media_storage_service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) MetadataRepository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Create(ctx context.Context, media *models.Media) error {
	return r.db.WithContext(ctx).Create(media).Error
}

func (r *postgresRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Media, error) {
	var media models.Media
	if err := r.db.WithContext(ctx).First(&media, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &media, nil
}

func (r *postgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Media{}, "id = ?", id).Error
}

func (r *postgresRepository) ListByPerson(ctx context.Context, personID uuid.UUID) ([]models.Media, error) {
	var media []models.Media
	if err := r.db.WithContext(ctx).Where("person_id = ?", personID).Find(&media).Error; err != nil {
		return nil, err
	}
	return media, nil
}
