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
	SyncWithProvider(ctx context.Context, personID uuid.UUID, testID uuid.UUID) error
}

type dnaService struct {
	repo      repository.Repository
	providers map[string]DNAProvider
}

func NewDNAService(repo repository.Repository) DNAService {
	return &dnaService{
		repo: repo,
		providers: map[string]DNAProvider{
			"Ancestry":   &AncestryStub{},
			"23andMe":    &TwentyThreeAndMeStub{},
			"MyHeritage": &MyHeritageStub{},
		},
	}
}

func (s *dnaService) LinkDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error {
	test.ID = uuid.New()
	test.PersonID = personID
	test.CreatedAt = time.Now()

	person, err := s.repo.GetPersonByID(ctx, personID)
	if err != nil {
		return fmt.Errorf("failed to get person: %w", err)
	}

	person.DNATests = append(person.DNATests, *test)

	if err := s.repo.UpdatePerson(ctx, person); err != nil {
		return fmt.Errorf("failed to update person with DNA test: %w", err)
	}

	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	person, err := s.repo.GetPersonByID(ctx, personID)
	if err != nil {
		return nil, fmt.Errorf("failed to get person: %w", err)
	}
	return person.DNATests, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, personID uuid.UUID, testID uuid.UUID) error {
	person, err := s.repo.GetPersonByID(ctx, personID)
	if err != nil {
		return fmt.Errorf("failed to get person: %w", err)
	}

	var test *models.DNATest
	var testIdx int
	found := false
	for i := range person.DNATests {
		if person.DNATests[i].ID == testID {
			test = &person.DNATests[i]
			testIdx = i
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("dna test not found")
	}

	provider, ok := s.providers[test.Provider]
	if !ok {
		return fmt.Errorf("unsupported provider: %s", test.Provider)
	}

	results, err := provider.FetchResults(ctx, test.KitID)
	if err != nil {
		return fmt.Errorf("failed to fetch results: %w", err)
	}

	// Update test with results
	test.ResultURL = results.ResultURL
	test.HaplogroupP = results.HaplogroupP
	test.HaplogroupM = results.HaplogroupM
	test.RawDataS3Key = results.RawDataS3Key

	// Update in slice
	person.DNATests[testIdx] = *test

	if err := s.repo.UpdatePerson(ctx, person); err != nil {
		return fmt.Errorf("failed to update person with DNA results: %w", err)
	}

	return nil
}
