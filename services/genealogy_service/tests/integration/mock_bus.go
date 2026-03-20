package integration

import (
	"context"

	"github.com/chifamba/dzinza/services/pkg/events"
)

type mockEventBus struct{}

func (m *mockEventBus) Publish(ctx context.Context, eventType events.EventType, payload interface{}) error {
	return nil
}

func (m *mockEventBus) Subscribe(ctx context.Context, eventType events.EventType) (<-chan string, error) {
	ch := make(chan string)
	return ch, nil
}

func (m *mockEventBus) Close() error {
	return nil
}
