package service

import (
	"context"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
)

type Service interface {
	LogAction(ctx context.Context, req models.CreateAuditLogRequest) error
	GetAuditLogs(ctx context.Context, query models.AuditLogQuery) ([]models.AuditLog, int64, error)
}
