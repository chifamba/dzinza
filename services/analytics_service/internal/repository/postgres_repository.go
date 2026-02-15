package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/analytics_service/internal/models"
	"gorm.io/gorm"
)

type Repository interface {
	SaveMetrics(ctx context.Context, metrics *models.PlatformMetrics) error
	GetLatestMetrics(ctx context.Context) (*models.PlatformMetrics, error)
	IncrementEventCount(ctx context.Context, eventType string) error
	GetEventMetrics(ctx context.Context, since time.Time) ([]models.EventMetric, error)
}

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) SaveMetrics(ctx context.Context, metrics *models.PlatformMetrics) error {
	return r.db.WithContext(ctx).Create(metrics).Error
}

func (r *postgresRepository) GetLatestMetrics(ctx context.Context) (*models.PlatformMetrics, error) {
	var metrics models.PlatformMetrics
	err := r.db.WithContext(ctx).Order("timestamp desc").First(&metrics).Error
	if err != nil {
		return nil, err
	}
	return &metrics, nil
}

func (r *postgresRepository) IncrementEventCount(ctx context.Context, eventType string) error {
	today := time.Now().Truncate(24 * time.Hour)
	return r.db.WithContext(ctx).Model(&models.EventMetric{}).
		Where("event_type = ? AND date = ?", eventType, today).
		UpdateColumn("count", gorm.Expr("count + 1")).
		Error
}

func (r *postgresRepository) GetEventMetrics(ctx context.Context, since time.Time) ([]models.EventMetric, error) {
	var metrics []models.EventMetric
	err := r.db.WithContext(ctx).Where("date >= ?", since).Find(&metrics).Error
	return metrics, err
}
