package service

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/models"
	"github.com/chifamba/dzinza/services/community_marketplace_service/internal/repository"
	"github.com/google/uuid"
)

type MarketplaceService interface {
	CreateListing(ctx context.Context, ownerID uuid.UUID, title, desc, ltype string, price float64) (*models.Listing, error)
	GetListing(ctx context.Context, id uuid.UUID) (*models.Listing, error)
	ListListings(ctx context.Context) ([]models.Listing, error)
}

type marketplaceService struct {
	repo repository.Repository
}

func NewMarketplaceService(repo repository.Repository) MarketplaceService {
	return &marketplaceService{repo: repo}
}

func (s *marketplaceService) CreateListing(ctx context.Context, ownerID uuid.UUID, title, desc, ltype string, price float64) (*models.Listing, error) {
	listing := &models.Listing{
		ID:          uuid.New(),
		Title:       title,
		Description: desc,
		Type:        ltype,
		Price:       price,
		Currency:    "USD", // Default
		OwnerID:     ownerID,
		Status:      "AVAILABLE",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	if err := s.repo.CreateListing(ctx, listing); err != nil {
		return nil, err
	}
	return listing, nil
}

func (s *marketplaceService) GetListing(ctx context.Context, id uuid.UUID) (*models.Listing, error) {
	return s.repo.GetListing(ctx, id)
}

func (s *marketplaceService) ListListings(ctx context.Context) ([]models.Listing, error) {
	return s.repo.ListListings(ctx)
}
