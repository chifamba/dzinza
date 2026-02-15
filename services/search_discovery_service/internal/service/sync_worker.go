package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/chifamba/dzinza/services/search_discovery_service/internal/repository"
)

type SyncWorker struct {
	eventBus  events.Bus
	searchSvc SearchService
	neo4jRepo repository.Neo4jRepository
}

func NewSyncWorker(eventBus events.Bus, searchSvc SearchService, neo4jRepo repository.Neo4jRepository) *SyncWorker {
	return &SyncWorker{
		eventBus:  eventBus,
		searchSvc: searchSvc,
		neo4jRepo: neo4jRepo,
	}
}

func (w *SyncWorker) Start(ctx context.Context) error {
	slog.Info("Starting sync worker")

	// Subscribe to person events
	chCreated, err := w.eventBus.Subscribe(ctx, events.PersonCreated)
	if err != nil {
		return fmt.Errorf("failed to subscribe to person.created: %w", err)
	}

	chUpdated, err := w.eventBus.Subscribe(ctx, events.PersonUpdated)
	if err != nil {
		return fmt.Errorf("failed to subscribe to person.updated: %w", err)
	}

	go w.handlePersonEvents(ctx, chCreated)
	go w.handlePersonEvents(ctx, chUpdated)

	return nil
}

func (w *SyncWorker) handlePersonEvents(ctx context.Context, ch <-chan string) {
	for msg := range ch {
		var payload struct {
			PersonID string `json:"person_id"`
		}
		if err := json.Unmarshal([]byte(msg), &payload); err != nil {
			slog.Error("Failed to unmarshal person event payload", "error", err)
			continue
		}

		slog.Info("Processing person event", "person_id", payload.PersonID)
		
		// Fetch full person details from Neo4j
		person, err := w.neo4jRepo.GetPersonByID(ctx, payload.PersonID)
		if err != nil {
			slog.Error("Failed to fetch person from Neo4j", "person_id", payload.PersonID, "error", err)
			continue
		}

		if person == nil {
			slog.Warn("Person not found in Neo4j", "person_id", payload.PersonID)
			continue
		}

		// Index in Elasticsearch
		if err := w.searchSvc.IndexPerson(ctx, *person); err != nil {
			slog.Error("Failed to index person in Elasticsearch", "person_id", payload.PersonID, "error", err)
			continue
		}

		slog.Info("Successfully synced person", "person_id", payload.PersonID)
	}
}
