package service

import (
	"context"
	"time"
	"fmt"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/repository"
	"github.com/google/uuid"
)

type DNAService interface {
	LinkDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error
	GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error)
	SyncWithProvider(ctx context.Context, testID uuid.UUID) error
}

type dnaService struct {
	repo repository.Repository
}

func NewDNAService(repo repository.Repository) DNAService {
	return &dnaService{repo: repo}
}

func (s *dnaService) LinkDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error {
	test.ID = uuid.New()
	test.PersonID = personID
	test.CreatedAt = time.Now()

	if err := s.repo.CreateDNATest(ctx, test); err != nil {
		return fmt.Errorf("failed to save DNA test: %w", err)
	}

	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	tests, err := s.repo.ListDNATestsByPerson(ctx, personID)
	if err != nil {
		return nil, fmt.Errorf("failed to get DNA tests: %w", err)
	}
	return tests, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// Simulated external DNA provider syncing functionality. In a complete production scenario,
	// this would make an external HTTP call via an integration service to fetch matching matches.
	return nil
}
