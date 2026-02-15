package events

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

// Bus defines the interface for event publishing and subscribing
type Bus interface {
	Publish(ctx context.Context, topic EventType, payload interface{}) error
	Subscribe(ctx context.Context, topic EventType) (<-chan string, error)
}

type redisBus struct {
	client *redis.Client
}

// NewRedisBus creates a new Redis-based event bus
func NewRedisBus(client *redis.Client) Bus {
	return &redisBus{
		client: client,
	}
}

// Publish publishes an event to a Redis topic
func (b *redisBus) Publish(ctx context.Context, topic EventType, payload interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal event payload: %w", err)
	}

	err = b.client.Publish(ctx, string(topic), data).Err()
	if err != nil {
		return fmt.Errorf("failed to publish to redis: %w", err)
	}

	return nil
}

// Subscribe subscribes to a Redis topic and returns a channel of raw message strings
func (b *redisBus) Subscribe(ctx context.Context, topic EventType) (<-chan string, error) {
	pubsub := b.client.Subscribe(ctx, string(topic))
	
	// Wait for confirmation that subscription is created
	_, err := pubsub.Receive(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to subscribe to redis topic: %w", err)
	}

	ch := make(chan string)
	go func() {
		defer close(ch)
		defer pubsub.Close()
		
		for msg := range pubsub.Channel() {
			ch <- msg.Payload
		}
	}()

	return ch, nil
}
