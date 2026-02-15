package service

import (
	"context"

	"github.com/chifamba/dzinza/services/search_discovery_service/internal/models"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/repository"
)

type SearchService interface {
	Search(ctx context.Context, query string, filters map[string]interface{}, page, limit int) (*models.SearchResponse, error)
	IndexPerson(ctx context.Context, person models.PersonIndex) error
	DeletePerson(ctx context.Context, id string) error
	InitializeIndex(ctx context.Context) error
}

type searchService struct {
	repo repository.SearchRepository
}

func NewSearchService(repo repository.SearchRepository) SearchService {
	return &searchService{
		repo: repo,
	}
}

func (s *searchService) Search(ctx context.Context, query string, filters map[string]interface{}, page, limit int) (*models.SearchResponse, error) {
	offset := (page - 1) * limit
	return s.repo.SearchPersons(ctx, query, filters, offset, limit)
}

func (s *searchService) IndexPerson(ctx context.Context, person models.PersonIndex) error {
	return s.repo.IndexPerson(ctx, person)
}

func (s *searchService) DeletePerson(ctx context.Context, id string) error {
	return s.repo.DeletePerson(ctx, id)
}

func (s *searchService) InitializeIndex(ctx context.Context) error {
	return s.repo.CreateIndex(ctx)
}
