package worker

import (
	"context"
	"log/slog"

	"github.com/chifamba/dzinza/services/analytics_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/events"
)

type AnalyticsWorker struct {
	svc      service.AnalyticsService
	eventBus events.Bus
}

func NewAnalyticsWorker(svc service.AnalyticsService, eventBus events.Bus) *AnalyticsWorker {
	return &AnalyticsWorker{
		svc:      svc,
		eventBus: eventBus,
	}
}

func (w *AnalyticsWorker) Start(ctx context.Context) {
	topics := []events.EventType{
		events.PersonCreated,
		events.PersonUpdated,
		events.RelationshipCreated,
		"user.created",
	}

	for _, topic := range topics {
		go func(t events.EventType) {
			ch, err := w.eventBus.Subscribe(ctx, t)
			if err != nil {
				slog.Error("failed to subscribe to topic", slog.String("topic", string(t)), slog.Any("error", err))
				return
			}

			for msg := range ch {
				w.processEvent(ctx, t, msg)
			}
		}(topic)
	}
}

func (w *AnalyticsWorker) processEvent(ctx context.Context, topic events.EventType, payload string) {
	slog.Info("processing event for analytics", slog.String("topic", string(topic)))
	
	if err := w.svc.RecordEvent(ctx, string(topic)); err != nil {
		slog.Error("failed to record event", slog.String("topic", string(topic)), slog.Any("error", err))
	}
}
