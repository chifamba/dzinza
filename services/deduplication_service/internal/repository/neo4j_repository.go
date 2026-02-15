package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type DeduplicationRepository interface {
	FindPotentialDuplicates(ctx context.Context) ([]models.DuplicatePair, error)
	MergePersons(ctx context.Context, survivingID, mergedID string) error
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) DeduplicationRepository {
	return &neo4jRepo{driver: driver}
}

func (r *neo4jRepo) FindPotentialDuplicates(ctx context.Context) ([]models.DuplicatePair, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	// Simple duplicate detection query: matching names and birth places
	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p1:Person), (p2:Person)
			WHERE p1.id < p2.id 
			  AND p1.given_name = p2.given_name 
			  AND p1.surname = p2.surname
			  AND (p1.birth_place = p2.birth_place OR p1.birth_date_string = p2.birth_date_string)
			RETURN p1.id, p2.id
		`
		res, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}
		
		var pairs []models.DuplicatePair
		for res.Next(ctx) {
			values := res.Record().Values
			pairs = append(pairs, models.DuplicatePair{
				Person1ID:       values[0].(string),
				Person2ID:       values[1].(string),
				ConfidenceScore: 0.8, // Static for now
				Status:          "PENDING",
				DetectedAt:      time.Now(),
			})
		}
		return pairs, nil
	})

	if err != nil {
		return nil, err
	}
	return result.([]models.DuplicatePair), nil
}

func (r *neo4jRepo) MergePersons(ctx context.Context, survivingID, mergedID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// 1. Move all relationships from merged node to surviving node
		// 2. Add merged_from_ids to surviving node
		// 3. Delete merged node
		query := `
			MATCH (s:Person {id: $surviving_id}), (m:Person {id: $merged_id})
			
			// Move outgoing relationships
			WITH s, m
			MATCH (m)-[r]->(target)
			WHERE NOT target:FamilyTree
			CALL apoc.merge.relationship(s, type(r), properties(r), {}, target) YIELD rel
			
			// Move incoming relationships
			WITH s, m
			MATCH (source)-[r]->(m)
			CALL apoc.merge.relationship(source, type(r), properties(r), {}, s) YIELD rel
			
			// Update surviving node
			WITH s, m
			SET s.merged_from_ids = COALESCE(s.merged_from_ids, []) + $merged_id
			
			// Delete merged node and its relationships
			DETACH DELETE m
			RETURN s
		`
		params := map[string]interface{}{
			"surviving_id": survivingID,
			"merged_id":    mergedID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}
