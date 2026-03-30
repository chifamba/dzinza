package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/relationship_verification_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Neo4jRepository interface {
	CreateSuggestion(ctx context.Context, suggestion *models.Suggestion) error
	VerifySuggestion(ctx context.Context, verifierID, suggestionID string) error
	UpdateSuggestionStatus(ctx context.Context, suggestionID, status string) error
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) Neo4jRepository {
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
				created_at: $created_at
			})
			CREATE (u)-[:PROPOSED]->(s)
			RETURN s
		`
		params := map[string]interface{}{
			"proposer_id": suggestion.ProposerID,
			"id":          suggestion.ID,
			"type":        suggestion.Type,
			"target_id":   suggestion.TargetID,
			"status":      string(suggestion.Status),
			"created_at":  suggestion.CreatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepo) VerifySuggestion(ctx context.Context, verifierID, suggestionID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (s:Suggestion {id: $suggestion_id})
			MERGE (u:User {id: $verifier_id})
			MERGE (u)-[:VERIFIED]->(s)
			RETURN s
		`
		params := map[string]interface{}{
			"suggestion_id": suggestionID,
			"verifier_id":   verifierID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepo) UpdateSuggestionStatus(ctx context.Context, suggestionID, status string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (s:Suggestion {id: $suggestion_id})
			SET s.status = $status, s.updated_at = $updated_at
			RETURN s
		`
		params := map[string]interface{}{
			"suggestion_id": suggestionID,
			"status":        status,
			"updated_at":    time.Now().Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}
