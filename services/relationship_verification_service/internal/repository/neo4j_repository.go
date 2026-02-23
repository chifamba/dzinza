package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

// NewNeo4jRepository creates a new verification repository backed by Neo4j.
func NewNeo4jRepository(driver neo4j.DriverWithContext) VerificationRepository {
	return &neo4jRepo{driver: driver}
}

func (r *neo4jRepo) CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error {
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
				created_at: $created_at,
				updated_at: $updated_at
			})
			CREATE (u)-[:PROPOSED]->(s)
		`
		params := map[string]interface{}{
			"id":          suggestion.ID,
			"type":        suggestion.Type,
			"target_id":   suggestion.TargetID,
			"proposer_id": suggestion.ProposerID,
			"status":      string(suggestion.Status),
			"created_at":  suggestion.CreatedAt.Format(time.RFC3339),
			"updated_at":  suggestion.UpdatedAt.Format(time.RFC3339),
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
		// Update suggestion status
		query := `
			MATCH (s:Suggestion {id: $id})
			SET s.status = $status,
				s.updated_at = $updated_at
			WITH s
			UNWIND $audit_trail AS entry
			MERGE (u:User {id: entry.user_id})
			MERGE (u)-[v:VERIFIED]->(s)
			SET v.action = entry.action,
				v.score = entry.trust_score,
				v.timestamp = entry.timestamp
		`

		// Map audit trail to slice of maps for UNWIND
		var auditTrail []map[string]interface{}
		for _, entry := range suggestion.AuditTrail {
			auditTrail = append(auditTrail, map[string]interface{}{
				"user_id":     entry.UserID,
				"action":      entry.Action,
				"trust_score": entry.TrustScore,
				"timestamp":   entry.Timestamp.Format(time.RFC3339),
			})
		}
		// If auditTrail is empty (nil), ensure it's an empty slice so UNWIND doesn't fail or iterate
		if auditTrail == nil {
			auditTrail = []map[string]interface{}{}
		}

		params := map[string]interface{}{
			"id":          suggestion.ID,
			"status":      string(suggestion.Status),
			"updated_at":  suggestion.UpdatedAt.Format(time.RFC3339),
			"audit_trail": auditTrail,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to update suggestion in neo4j: %w", err)
	}
	return nil
}

func (r *neo4jRepo) GetSuggestionByID(ctx context.Context, id string) (*models.Suggestion, error) {
	return nil, fmt.Errorf("not implemented in neo4j repo")
}

func (r *neo4jRepo) ListPendingSuggestions(ctx context.Context) ([]models.Suggestion, error) {
	return nil, fmt.Errorf("not implemented in neo4j repo")
}
