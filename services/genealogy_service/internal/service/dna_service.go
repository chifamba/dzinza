package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
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
	slog.Info("syncing DNA test with provider", slog.String("test_id", testID.String()))

	// Note: in a real implementation we would look up the DNA test provider from the DB first.
	// For now, we simulate calling the integration service with a default provider.
	payload := map[string]interface{}{
		"provider": "23andMe",
		"config":   map[string]string{"access_token": "dummy-token"},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal integration request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "http://integration_service:8017/api/v1/integration/sync", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("failed to create integration request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Error("failed to call integration service", slog.Any("error", err))
		return fmt.Errorf("failed to call integration service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("integration service returned status: %d", resp.StatusCode)
	}

	slog.Info("successfully synced DNA test with provider", slog.String("test_id", testID.String()))
	return nil
}
