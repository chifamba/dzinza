package service

import (
	"context"
	"encoding/json"

	"github.com/chifamba/dzinza/services/audit_history_service/internal/models"
	"github.com/chifamba/dzinza/services/audit_history_service/internal/repository"
	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type auditService struct {
	repo repository.Repository
}

func NewAuditService(repo repository.Repository) Service {
	return &auditService{repo: repo}
}

func (s *auditService) LogAction(ctx context.Context, req models.CreateAuditLogRequest) error {
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		return err
	}

	oldVal, _ := json.Marshal(req.OldValue)
	newVal, _ := json.Marshal(req.NewValue)

	log := &models.AuditLog{
		UserID:     userID,
		Action:     req.Action,
		EntityType: req.EntityType,
		EntityID:   req.EntityID,
		OldValue:   datatypes.JSON(oldVal),
		NewValue:   datatypes.JSON(newVal),
		IPAddress:  req.IPAddress,
	}

	return s.repo.Create(ctx, log)
}

func (s *auditService) GetAuditLogs(ctx context.Context, query models.AuditLogQuery) ([]models.AuditLog, int64, error) {
	return s.repo.List(ctx, query)
}
