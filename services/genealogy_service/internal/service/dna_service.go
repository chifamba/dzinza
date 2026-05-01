package service

import (
	"context"
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

	return s.repo.LinkDNATest(ctx, personID, test)
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	return s.repo.GetDNATests(ctx, personID)
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	test, err := s.repo.GetDNATestByID(ctx, testID)
	if err != nil {
		return err
	}
	if test == nil {
		return nil
	}

	// Mocking functional response without doing real network request
	if test.Provider == "Ancestry" {
		test.HaplogroupP = "R-M269"
		test.HaplogroupM = "H1"
		test.ResultURL = "https://ancestry.com/results/mock"
	} else if test.Provider == "23andMe" {
		test.HaplogroupP = "E-M96"
		test.HaplogroupM = "L3"
		test.ResultURL = "https://23andme.com/results/mock"
	} else {
		test.HaplogroupP = "Unknown"
		test.HaplogroupM = "Unknown"
		test.ResultURL = "https://provider.com/results/mock"
	}

	return s.repo.UpdateDNATest(ctx, test)
}
