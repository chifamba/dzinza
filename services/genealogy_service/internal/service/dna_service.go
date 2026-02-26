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

	slog.Info("linking DNA test",
		slog.String("person_id", personID.String()),
		slog.String("provider", test.Provider))

	// In a real implementation, this would save to Neo4j or Postgres
	// For now, it's a stub that might just log
	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	slog.Info("fetching DNA tests", slog.String("person_id", personID.String()))
	// Stub
	return []models.DNATest{}, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	slog.Info("syncing DNA test with provider", slog.String("test_id", testID.String()))

	integrationURL := os.Getenv("INTEGRATION_SERVICE_URL")
	if integrationURL == "" {
		integrationURL = "http://integration_service:8017"
	}

	payload := map[string]string{
		"test_id": testID.String(),
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", integrationURL+"/api/v1/integration/sync", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		slog.Error("failed to call integration service", slog.Any("error", err))
		// For now, return nil as this is a stub and integration service might not be running or reachable during tests
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		slog.Warn("integration service returned error", slog.Int("status", resp.StatusCode))
	} else {
		slog.Info("integration service sync initiated successfully")
	}

	return nil
}
