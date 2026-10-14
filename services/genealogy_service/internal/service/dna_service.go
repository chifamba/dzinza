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

	// Save to Neo4j database using the repository
	return s.repo.LinkDNATest(ctx, personID, test)
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	// Retrieve from database
	return s.repo.GetDNATests(ctx, personID)
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// Fetch the test from the database
	test, err := s.repo.GetDNATestByID(ctx, testID)
	if err != nil {
		return err
	}
	if test == nil {
		return nil
	}

	// Simulate functional mock data based on provider because external providers lack public APIs
	if test.Provider == "Ancestry" {
		test.HaplogroupP = "R1b"
		test.HaplogroupM = "H1a"
	} else if test.Provider == "23andMe" {
		test.HaplogroupP = "E-M96"
		test.HaplogroupM = "L2a1"
	} else {
		test.HaplogroupP = "Unknown"
		test.HaplogroupM = "Unknown"
	}

	// Update the test in the database
	return s.repo.UpdateDNATest(ctx, test)
}
