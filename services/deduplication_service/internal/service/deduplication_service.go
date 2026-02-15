package service

import (
	"context"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/models"
	"github.com/chifamba/dzinza/services/deduplication_service/internal/repository"
)

type DeduplicationService interface {
	DetectDuplicates(ctx context.Context) ([]models.DuplicatePair, error)
	Merge(ctx context.Context, survivingID, mergedID string) error
}

type deduplicationService struct {
	repo repository.DeduplicationRepository
}

func NewDeduplicationService(repo repository.DeduplicationRepository) DeduplicationService {
	return &deduplicationService{
		repo: repo,
	}
}

func (s *deduplicationService) DetectDuplicates(ctx context.Context) ([]models.DuplicatePair, error) {
	return s.repo.FindPotentialDuplicates(ctx)
}

func (s *deduplicationService) Merge(ctx context.Context, survivingID, mergedID string) error {
	return s.repo.MergePersons(ctx, survivingID, mergedID)
}
