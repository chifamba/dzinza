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
	if test.CreatedAt.IsZero() {
		test.CreatedAt = time.Now()
	}
	return s.repo.CreateDNATest(ctx, test)
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	return s.repo.GetDNATestsByPersonID(ctx, personID)
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// 1. Get the existing test from the repository
	test, err := s.repo.GetDNATestByID(ctx, testID)
	if err != nil {
		return err
	}
	if test == nil {
		return fmt.Errorf("DNA test not found")
	}

	// 2. Fetch data from external provider (Stub implementation)
	// In a real scenario, this would involve calling the provider's API.
	// For now, we simulate by updating some mock data based on the provider.
	switch test.Provider {
	case "Ancestry":
		test.HaplogroupP = "R-M269"
		test.HaplogroupM = "H1"
		test.ResultURL = "https://ancestry.com/dna/results/" + test.KitID
	case "23andMe":
		test.HaplogroupP = "E-M96"
		test.HaplogroupM = "L3"
		test.ResultURL = "https://you.23andme.com/reports/" + test.KitID
	case "MyHeritage":
		test.HaplogroupP = "J-M267"
		test.HaplogroupM = "U5"
		test.ResultURL = "https://myheritage.com/dna/" + test.KitID
	default:
		// Unknown provider, do nothing
	}

	// 3. Update the record in the database
	return s.repo.UpdateDNATest(ctx, test)
}
