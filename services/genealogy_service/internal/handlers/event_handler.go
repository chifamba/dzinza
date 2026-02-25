package handlers

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/events"
)

type EventHandler struct {
	svc service.Service
}

func NewEventHandler(svc service.Service) *EventHandler {
	return &EventHandler{
		svc: svc,
	}
}

func (h *EventHandler) HandleRelationshipVerified(ctx context.Context, payload []byte) error {
	var event events.RelationshipVerifiedPayload
	if err := json.Unmarshal(payload, &event); err != nil {
		slog.Error("failed to unmarshal relationship.verified payload", slog.Any("error", err))
		return err
	}

	if event.Status != "CONFIRMED" {
		slog.Info("ignoring non-confirmed suggestion",
			slog.String("suggestion_id", event.SuggestionID),
			slog.String("status", event.Status))
		return nil
	}

	slog.Info("applying confirmed suggestion",
		slog.String("suggestion_id", event.SuggestionID),
		slog.String("target_id", event.RelationshipID))

	if err := h.svc.ApplySuggestion(ctx, event.RelationshipID, event.Payload); err != nil {
		slog.Error("failed to apply suggestion",
			slog.String("suggestion_id", event.SuggestionID),
			slog.Any("error", err))
		return err
	}

	slog.Info("successfully applied suggestion", slog.String("suggestion_id", event.SuggestionID))
	return nil
}
