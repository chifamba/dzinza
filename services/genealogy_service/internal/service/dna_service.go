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

	// Delegate to the repository
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

	// Functional mock logic to simulate external provider synchronization
	// without executing real HTTP requests to unauthenticated endpoints.
	switch test.Provider {
	case "Ancestry":
		test.HaplogroupM = "H1a"
		test.TestType = "Autosomal"
		test.ResultURL = "https://ancestry.com/mock/results/" + test.KitID
	case "23andMe":
		test.HaplogroupP = "R-M269"
		test.HaplogroupM = "L3"
		test.TestType = "Combined"
		test.ResultURL = "https://23andme.com/mock/results/" + test.KitID
	default:
		// Generic mock data for other providers
		test.HaplogroupP = "E-M2"
		test.TestType = "Y-DNA"
		test.ResultURL = "https://provider.com/mock/results/" + test.KitID
	}

	// Update the synchronized data in the database
	return s.repo.UpdateDNATest(ctx, test)
}
