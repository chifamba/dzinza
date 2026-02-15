package service

import (
	"context"
	"log/slog"

	"github.com/chifamba/dzinza/services/pkg/events"
)

type TrustWorker struct {
	eventBus events.Bus
	trustSvc TrustService
}

func NewTrustWorker(eventBus events.Bus, trustSvc TrustService) *TrustWorker {
	return &TrustWorker{
		eventBus: eventBus,
		trustSvc: trustSvc,
	}
}

func (w *TrustWorker) Start(ctx context.Context) error {
	slog.Info("Starting trust worker")

	// Subscribe to events that affect trust
	// For now, let's just log them
	
	return nil
}
