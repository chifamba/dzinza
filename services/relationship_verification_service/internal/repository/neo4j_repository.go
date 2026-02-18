package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Neo4jRepository interface {
	CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
	UpdateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) Neo4jRepository {
	return &neo4jRepo{driver: driver}
}

func (r *neo4jRepo) CreateSuggestion(ctx context.Context, s *models.Suggestion) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (u:User {id: $proposer_id})
			CREATE (s:Suggestion {
				id: $id,
				type: $type,
				target_id: $target_id,
				status: $status,
				created_at: $created_at
			})
			CREATE (u)-[:PROPOSED]->(s)
		`
		params := map[string]interface{}{
			"proposer_id": s.ProposerID,
			"id":          s.ID,
			"type":        s.Type,
			"target_id":   s.TargetID,
			"status":      string(s.Status),
			"created_at":  s.CreatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to create suggestion in neo4j: %w", err)
	}
	return nil
}

func (r *neo4jRepo) UpdateSuggestion(ctx context.Context, s *models.Suggestion) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Update suggestion status
		query := `
			MATCH (s:Suggestion {id: $id})
			SET s.status = $status,
				s.updated_at = $updated_at,
				s.confirmation_count = $conf_count
		`
		params := map[string]interface{}{
			"id":         s.ID,
			"status":     string(s.Status),
			"updated_at": s.UpdatedAt.Format(time.RFC3339),
			"conf_count": s.ConfirmationCount,
		}
		if _, err := tx.Run(ctx, query, params); err != nil {
			return nil, err
		}

		// Process verifications
		for _, entry := range s.AuditTrail {
			verifyQuery := `
				MATCH (s:Suggestion {id: $id})
				MERGE (u:User {id: $verifier_id})
				MERGE (u)-[r:VERIFIED]->(s)
				SET r.timestamp = $timestamp,
					r.score = $score,
					r.action = $action
			`
			verifyParams := map[string]interface{}{
				"id":          s.ID,
				"verifier_id": entry.UserID,
				"timestamp":   entry.Timestamp.Format(time.RFC3339),
				"score":       entry.TrustScore,
				"action":      entry.Action,
			}
			if _, err := tx.Run(ctx, verifyQuery, verifyParams); err != nil {
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
