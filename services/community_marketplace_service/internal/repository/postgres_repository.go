package repository

import (
	"context"
	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Repository interface {
	CreateListing(ctx context.Context, listing *models.Listing) error
	GetListing(ctx context.Context, id uuid.UUID) (*models.Listing, error)
	ListListings(ctx context.Context) ([]models.Listing, error)
	UpdateListing(ctx context.Context, listing *models.Listing) error
	DeleteListing(ctx context.Context, id uuid.UUID) error
}

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) CreateListing(ctx context.Context, listing *models.Listing) error {
	return r.db.WithContext(ctx).Create(listing).Error
}

func (r *postgresRepository) GetListing(ctx context.Context, id uuid.UUID) (*models.Listing, error) {
	var listing models.Listing
	err := r.db.WithContext(ctx).First(&listing, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &listing, nil
}

func (r *postgresRepository) ListListings(ctx context.Context) ([]models.Listing, error) {
	var listings []models.Listing
	err := r.db.WithContext(ctx).Find(&listings).Error
	return listings, err
}

func (r *postgresRepository) UpdateListing(ctx context.Context, listing *models.Listing) error {
	return r.db.WithContext(ctx).Save(listing).Error
}

func (r *postgresRepository) DeleteListing(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Listing{}, "id = ?", id).Error
}
