package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
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
	repo       repository.Repository
	httpClient *http.Client
}

func NewDNAService(repo repository.Repository) DNAService {
	return &dnaService{
		repo: repo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *dnaService) LinkDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error {
	test.ID = uuid.New()
	test.PersonID = personID
	test.CreatedAt = time.Now()
	// In a real implementation, this would save to Neo4j or Postgres
	slog.Info("linked DNA test", slog.String("test_id", test.ID.String()), slog.String("person_id", personID.String()))
	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	// Stub
	return []models.DNATest{}, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	// Fetch test details (stub: assume we have provider info)
	// In reality we'd fetch the test from repo to get provider name and config

	providerName := "23andMe" // Default for stub
	config := map[string]string{
		"test_id": testID.String(),
	}

	payload := map[string]interface{}{
		"provider": providerName,
		"config":   config,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	baseURL := os.Getenv("INTEGRATION_SERVICE_URL")
	if baseURL == "" {
		baseURL = "http://integration_service:8017"
	}
	url := fmt.Sprintf("%s/api/v1/integration/sync", baseURL)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call integration service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("integration service returned status %d", resp.StatusCode)
	}

	slog.Info("synced DNA test with provider", slog.String("test_id", testID.String()), slog.String("provider", providerName))
	return nil
}
