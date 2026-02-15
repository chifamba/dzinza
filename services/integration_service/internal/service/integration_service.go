package service

import (
	"context"
	"log/slog"
)

type IntegrationService interface {
	SyncExternalData(ctx context.Context, provider string) error
}

type integrationService struct{}

func NewIntegrationService() IntegrationService {
	return &integrationService{}
}

func (s *integrationService) SyncExternalData(ctx context.Context, provider string) error {
	slog.Info("syncing data from external provider", slog.String("provider", provider))
	// In a real implementation, this would call external APIs
	return nil
}
