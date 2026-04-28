package service

import (
	"context"
	"fmt"
	"time"

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

	return s.repo.CreateDNATest(ctx, test)
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	return s.repo.GetDNATestsByPerson(ctx, personID)
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	test, err := s.repo.GetDNATestByID(ctx, testID)
	if err != nil {
		return err
	}
	if test == nil {
		return fmt.Errorf("DNA test with id %s not found", testID)
	}

	// Mocking integration with external providers to retrieve haplogroup data
	test.HaplogroupP = "R-M269"
	test.HaplogroupM = "H1a"

	return s.repo.UpdateDNATest(ctx, test)
}
