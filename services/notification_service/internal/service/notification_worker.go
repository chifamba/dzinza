package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/chifamba/dzinza/services/pkg/events"
)

type NotificationWorker struct {
	eventBus    events.Bus
	notifSvc    Service
}

func NewNotificationWorker(eventBus events.Bus, notifSvc Service) *NotificationWorker {
	return &NotificationWorker{
		eventBus:    eventBus,
		notifSvc:    notifSvc,
	}
}

func (w *NotificationWorker) Start(ctx context.Context) error {
	slog.Info("Starting notification worker")

	// Subscribe to relevant events
	chRelationship, err := w.eventBus.Subscribe(ctx, events.RelationshipCreated)
	if err != nil {
		return fmt.Errorf("failed to subscribe to relationship.created: %w", err)
	}

	chBanned, err := w.eventBus.Subscribe(ctx, events.UserBanned)
	if err != nil {
		return fmt.Errorf("failed to subscribe to user.banned: %w", err)
	}

	go w.handleRelationshipEvents(ctx, chRelationship)
	go w.handleUserEvents(ctx, chBanned)

	return nil
}

func (w *NotificationWorker) handleRelationshipEvents(ctx context.Context, ch <-chan string) {
	for msg := range ch {
		var payload events.RelationshipCreatedPayload
		if err := json.Unmarshal([]byte(msg), &payload); err != nil {
			continue
		}

		// Notify person 1 about new relationship with person 2
		_ = w.notifSvc.Notify(ctx, models.CreateNotificationRequest{
			UserID:  payload.Person1ID,
			Type:    "RELATIONSHIP_CREATED",
			Title:   "New Relationship Added",
			Message: fmt.Sprintf("A new %s relationship has been added.", payload.Type),
		})
	}
}

func (w *NotificationWorker) handleUserEvents(ctx context.Context, ch <-chan string) {
	for msg := range ch {
		var payload events.UserBannedPayload
		if err := json.Unmarshal([]byte(msg), &payload); err != nil {
			continue
		}

		_ = w.notifSvc.Notify(ctx, models.CreateNotificationRequest{
			UserID:  payload.UserID,
			Type:    "USER_BANNED",
			Title:   "Account Banned",
			Message: fmt.Sprintf("Your account has been banned for: %s", payload.Reason),
		})
	}
}
