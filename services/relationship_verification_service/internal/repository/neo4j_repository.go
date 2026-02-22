package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// Neo4jRepository defines the write-only interface for Neo4j operations.
type Neo4jRepository interface {
	CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
	UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

// NewNeo4jRepository creates a new Neo4j repository.
func NewNeo4jRepository(driver neo4j.DriverWithContext) Neo4jRepository {
	return &neo4jRepo{driver: driver}
}

func (r *neo4jRepo) CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (u:User {id: $proposerId})
			MERGE (s:Suggestion {id: $suggestionId})
			SET s.type = $type,
				s.target_id = $targetId,
				s.status = $status,
				s.created_at = $createdAt
			MERGE (u)-[:PROPOSED]->(s)
		`
		params := map[string]interface{}{
			"proposerId":   suggestion.ProposerID,
			"suggestionId": suggestion.ID,
			"type":         suggestion.Type,
			"targetId":     suggestion.TargetID,
			"status":       string(suggestion.Status),
			"createdAt":    suggestion.CreatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to create suggestion in neo4j: %w", err)
	}
	return nil
}

func (r *neo4jRepo) UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Update suggestion properties
		query := `
			MERGE (s:Suggestion {id: $suggestionId})
			SET s.status = $status,
				s.updated_at = $updatedAt,
				s.confirmation_count = $confCount
		`
		params := map[string]interface{}{
			"suggestionId": suggestion.ID,
			"status":       string(suggestion.Status),
			"updatedAt":    suggestion.UpdatedAt.Format(time.RFC3339),
			"confCount":    suggestion.ConfirmationCount,
		}

		if _, err := tx.Run(ctx, query, params); err != nil {
			return nil, err
		}

		// If there are audit entries, creating the VERIFIED relationship for the latest one
		if len(suggestion.AuditTrail) > 0 {
			lastEntry := suggestion.AuditTrail[len(suggestion.AuditTrail)-1]

			queryRel := `
				MATCH (s:Suggestion {id: $suggestionId})
				MERGE (u:User {id: $verifierId})
				MERGE (u)-[:VERIFIED {action: $action, score: $score, timestamp: $timestamp}]->(s)
			`
			paramsRel := map[string]interface{}{
				"suggestionId": suggestion.ID,
				"verifierId":   lastEntry.UserID,
				"action":       lastEntry.Action,
				"score":        lastEntry.TrustScore,
				"timestamp":    lastEntry.Timestamp.Format(time.RFC3339),
			}
			if _, err := tx.Run(ctx, queryRel, paramsRel); err != nil {
				return nil, err
			}
		}

		return nil, nil
	})

	if err != nil {
		return fmt.Errorf("failed to update suggestion in neo4j: %w", err)
	}
	return nil
}
