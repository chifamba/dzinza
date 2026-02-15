package service

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/analytics_service/internal/models"
	"github.com/chifamba/dzinza/services/analytics_service/internal/repository"
)

type AnalyticsService interface {
	GetPlatformStats(ctx context.Context) (*models.PlatformMetrics, error)
	GetEventStats(ctx context.Context, days int) ([]models.EventMetric, error)
	RecordEvent(ctx context.Context, eventType string) error
}

type analyticsService struct {
	repo repository.Repository
}

func NewAnalyticsService(repo repository.Repository) AnalyticsService {
	return &analyticsService{repo: repo}
}

func (s *analyticsService) GetPlatformStats(ctx context.Context) (*models.PlatformMetrics, error) {
	return s.repo.GetLatestMetrics(ctx)
}

func (s *analyticsService) GetEventStats(ctx context.Context, days int) ([]models.EventMetric, error) {
	since := time.Now().AddDate(0, 0, -days)
	return s.repo.GetEventMetrics(ctx, since)
}

func (s *analyticsService) RecordEvent(ctx context.Context, eventType string) error {
	return s.repo.IncrementEventCount(ctx, eventType)
}
