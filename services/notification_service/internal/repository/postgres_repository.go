package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type postgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Create(ctx context.Context, n *models.Notification) error {
	return r.db.WithContext(ctx).Create(n).Error
}

func (r *postgresRepository) ListByUser(ctx context.Context, userID uuid.UUID, page, limit int, unreadOnly bool) ([]models.Notification, int64, error) {
	var ns []models.Notification = []models.Notification{}
	var total int64

	query := r.db.WithContext(ctx).Model(&models.Notification{}).Where("user_id = ?", userID)
	if unreadOnly {
		query = query.Where("read = ?", false)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&ns).Error; err != nil {
		return nil, 0, err
	}

	return ns, total, nil
}

func (r *postgresRepository) MarkAsRead(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&models.Notification{}).Where("id = ?", id).Update("read", true).Error
}
