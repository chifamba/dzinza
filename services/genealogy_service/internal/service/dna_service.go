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
	slog.Info("Linking DNA test to person", slog.String("person_id", personID.String()), slog.String("test_id", test.ID.String()))
	return nil
}

func (s *dnaService) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	// Stub
	slog.Info("Getting DNA tests for person", slog.String("person_id", personID.String()))
	return []models.DNATest{}, nil
}

func (s *dnaService) SyncWithProvider(ctx context.Context, testID uuid.UUID) error {
	slog.Info("Syncing DNA test with provider", slog.String("test_id", testID.String()))

	url := "http://integration_service:8017/api/v1/integration/sync"
	reqBody, _ := json.Marshal(map[string]interface{}{
		"provider": "AncestryDNA",
		"config":   map[string]string{"test_id": testID.String()},
	})

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create sync request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		slog.Error("Failed to sync DNA data with provider", slog.Any("error", err))
		return fmt.Errorf("failed to sync DNA data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("sync failed with status code: %d", resp.StatusCode)
	}

	return nil
}
