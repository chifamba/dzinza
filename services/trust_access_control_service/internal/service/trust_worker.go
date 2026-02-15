package service

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/chifamba/dzinza/services/pkg/events"
)

// TrustWorker subscribes to relevant events and triggers trust score recalculations.
type TrustWorker struct {
	eventBus events.Bus
	trustSvc TrustService
}

// NewTrustWorker creates a new trust worker that listens for events and recalculates scores.
func NewTrustWorker(eventBus events.Bus, trustSvc TrustService) *TrustWorker {
	return &TrustWorker{
		eventBus: eventBus,
		trustSvc: trustSvc,
	}
}

// Start begins listening for events that affect trust scores and starts the decay ticker.
func (w *TrustWorker) Start(ctx context.Context) error {
	slog.Info("Starting trust worker")

	// Subscribe to relationship.verified events
	if err := w.subscribeToVerified(ctx); err != nil {
		slog.Error("failed to subscribe to relationship.verified", slog.Any("error", err))
	}

	// Subscribe to person.created events
	if err := w.subscribeToPersonCreated(ctx); err != nil {
		slog.Error("failed to subscribe to person.created", slog.Any("error", err))
	}

	// Subscribe to person.updated events
	if err := w.subscribeToPersonUpdated(ctx); err != nil {
		slog.Error("failed to subscribe to person.updated", slog.Any("error", err))
	}

	// Start periodic recalculation ticker for trust decay
	go w.startDecayTicker(ctx)

	return nil
}

func (w *TrustWorker) subscribeToVerified(ctx context.Context) error {
	ch, err := w.eventBus.Subscribe(ctx, events.RelationshipVerified)
	if err != nil {
		return err
	}

	go func() {
		for msg := range ch {
			var payload events.RelationshipVerifiedPayload
			if err := json.Unmarshal([]byte(msg), &payload); err != nil {
				slog.Error("failed to unmarshal relationship.verified event",
					slog.Any("error", err))
				continue
			}

			slog.Info("recalculating trust score after relationship verification",
				slog.String("verified_by", payload.VerifiedBy))

			if err := w.trustSvc.CalculateAndStoreScore(ctx, payload.VerifiedBy); err != nil {
				slog.Error("failed to recalculate trust score",
					slog.String("user_id", payload.VerifiedBy),
					slog.Any("error", err))
			}
		}
	}()

	return nil
}

func (w *TrustWorker) subscribeToPersonCreated(ctx context.Context) error {
	ch, err := w.eventBus.Subscribe(ctx, events.PersonCreated)
	if err != nil {
		return err
	}

	go func() {
		for msg := range ch {
			var payload events.PersonCreatedPayload
			if err := json.Unmarshal([]byte(msg), &payload); err != nil {
				slog.Error("failed to unmarshal person.created event",
					slog.Any("error", err))
				continue
			}

			// Extract the user who created the person (from TreeID context)
			// Note: In a production system, person.created would include a creator_id field
			slog.Info("received person.created event",
				slog.String("person_id", payload.PersonID),
				slog.String("tree_id", payload.TreeID))
		}
	}()

	return nil
}

func (w *TrustWorker) subscribeToPersonUpdated(ctx context.Context) error {
	ch, err := w.eventBus.Subscribe(ctx, events.PersonUpdated)
	if err != nil {
		return err
	}

	go func() {
		for msg := range ch {
			var payload events.PersonUpdatedPayload
			if err := json.Unmarshal([]byte(msg), &payload); err != nil {
				slog.Error("failed to unmarshal person.updated event",
					slog.Any("error", err))
				continue
			}

			slog.Info("received person.updated event",
				slog.String("person_id", payload.PersonID))
		}
	}()

	return nil
}

// startDecayTicker periodically recalculates trust scores to apply decay rules.
// Runs once per hour.
func (w *TrustWorker) startDecayTicker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			slog.Info("trust decay ticker fired")
			// In a production system, this would query for all users and recalculate.
			// For now, the decay is applied whenever a score is individually recalculated.
		case <-ctx.Done():
			slog.Info("trust decay ticker stopped")
			return
		}
	}
}
