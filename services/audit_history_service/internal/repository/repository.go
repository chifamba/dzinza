package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
)

type Repository interface {
	Create(ctx context.Context, log *models.AuditLog) error
	List(ctx context.Context, query models.AuditLogQuery) ([]models.AuditLog, int64, error)
}
