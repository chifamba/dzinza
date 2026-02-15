package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Create(ctx context.Context, log *models.AuditLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *postgresRepository) List(ctx context.Context, query models.AuditLogQuery) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	db := r.db.WithContext(ctx).Model(&models.AuditLog{})

	if query.UserID != "" {
		uid, err := uuid.Parse(query.UserID)
		if err == nil {
			db = db.Where("user_id = ?", uid)
		}
	}
	if query.Action != "" {
		db = db.Where("action = ?", query.Action)
	}
	if query.EntityType != "" {
		db = db.Where("entity_type = ?", query.EntityType)
	}
	if query.EntityID != "" {
		db = db.Where("entity_id = ?", query.EntityID)
	}

	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (query.Page - 1) * query.Limit
	if err := db.Offset(offset).Limit(query.Limit).Order("timestamp DESC").Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}
