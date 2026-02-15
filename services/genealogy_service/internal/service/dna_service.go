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
	// In a real implementation, this would save to Neo4j or Postgres
	// For now, it's a stub that might just log
	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	// Stub
	return []models.DNATest{}, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// Stub for syncing with Ancestry, 23andMe, etc.
	return nil
}
