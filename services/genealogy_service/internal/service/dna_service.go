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

	// Check if person exists before creating link
	_, err := s.repo.GetPersonByID(ctx, personID)
	if err != nil {
		return err
	}

	return s.repo.CreateDNATest(ctx, personID, test)
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	return s.repo.GetDNATests(ctx, personID)
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// 1. Get the existing DNA test
	test, err := s.repo.GetDNATestByID(ctx, testID)
	if err != nil {
		return err
	}
	if test == nil {
		return ErrPersonNotFound // In context of test, using simple error or custom
	}

	// 2. Functional mock data response (simulating Ancestry/23andMe)
	// Since there are no public endpoints to call, we mock the result of a sync
	if test.Provider == "Ancestry" {
		test.HaplogroupP = "R-M269"
		test.ResultURL = "https://ancestry.mock/results/" + test.KitID
	} else if test.Provider == "23andMe" {
		test.HaplogroupM = "H1a"
		test.HaplogroupP = "E-M96"
		test.ResultURL = "https://23andme.mock/reports/" + test.KitID
	} else {
		test.HaplogroupM = "L3"
	}

	// 3. Save the updated test
	return s.repo.UpdateDNATest(ctx, test)
}
