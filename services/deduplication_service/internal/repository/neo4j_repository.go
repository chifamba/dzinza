package repository

import (
	"context"
	"time"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// DeduplicationRepository defines the interface for deduplication data access.
type DeduplicationRepository interface {
	FindCandidatePairs(ctx context.Context) ([]models.PersonCandidate, error)
	GetPersonRelatives(ctx context.Context, personID string) ([]string, error)
	MergePersons(ctx context.Context, survivingID, mergedID string) error
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

// NewNeo4jRepository creates a new deduplication repository backed by Neo4j.
func NewNeo4jRepository(driver neo4j.DriverWithContext) DeduplicationRepository {
	return &neo4jRepo{driver: driver}
}

// FindCandidatePairs finds potential duplicate candidates using broad criteria
// (same first letter of surname OR similar birth year range).
func (r *neo4jRepo) FindCandidatePairs(ctx context.Context) ([]models.PersonCandidate, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Broad candidate query: persons sharing the first letter of surname
		// or within 10 years of birth date
		query := `
			MATCH (p:Person)
			WHERE p.surname IS NOT NULL
			RETURN p.id AS id, 
				   p.given_name AS given_name,
				   p.surname AS surname,
				   p.birth_date_string AS birth_date,
				   p.birth_place AS birth_place,
				   p.death_date_string AS death_date,
				   p.gender AS gender
			ORDER BY p.surname, p.given_name
		`
		res, err := tx.Run(ctx, query, nil)
		if err != nil {
			return nil, err
		}

		var candidates []models.PersonCandidate
		for res.Next(ctx) {
			record := res.Record()
			candidate := models.PersonCandidate{
				ID:        stringFromNeo4j(record, "id"),
				GivenName: stringFromNeo4j(record, "given_name"),
				Surname:   stringFromNeo4j(record, "surname"),
				BirthDate: stringFromNeo4j(record, "birth_date"),
				BirthPlace: stringFromNeo4j(record, "birth_place"),
				DeathDate: stringFromNeo4j(record, "death_date"),
				Gender:    stringFromNeo4j(record, "gender"),
			}
			candidates = append(candidates, candidate)
		}
		return candidates, nil
	})

	if err != nil {
		return nil, err
	}
	return result.([]models.PersonCandidate), nil
}

// GetPersonRelatives returns the IDs of a person's immediate relatives (parents, children, spouses).
func (r *neo4jRepo) GetPersonRelatives(ctx context.Context, personID string) ([]string, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p:Person {id: $id})-[:PARENT_OF|SPOUSE_OF|SIBLING_OF]-(relative:Person)
			RETURN DISTINCT relative.id AS relative_id
		`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": personID})
		if err != nil {
			return nil, err
		}

		var ids []string
		for res.Next(ctx) {
			if id, ok := res.Record().Get("relative_id"); ok {
				if s, ok := id.(string); ok {
					ids = append(ids, s)
				}
			}
		}
		return ids, nil
	})

	if err != nil {
		return nil, err
	}
	return result.([]string), nil
}

// MergePersons merges the merged person into the surviving person.
func (r *neo4jRepo) MergePersons(ctx context.Context, survivingID, mergedID string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (s:Person {id: $surviving_id}), (m:Person {id: $merged_id})
			
			// Move outgoing relationships using subquery with UNION to prevent stopping
			CALL {
				WITH s, m
				MATCH (m)-[r]->(target)
				WHERE NOT target:FamilyTree
				CALL apoc.merge.relationship(s, type(r), properties(r), {}, target) YIELD rel
				RETURN count(rel) AS out_rels
				UNION
				RETURN 0 AS out_rels
			}
			WITH s, m, sum(out_rels) AS total_out
			
			// Move incoming relationships using subquery with UNION
			CALL {
				WITH s, m
				MATCH (source)-[r]->(m)
				CALL apoc.merge.relationship(source, type(r), properties(r), {}, s) YIELD rel
				RETURN count(rel) AS in_rels
				UNION
				RETURN 0 AS in_rels
			}
			WITH s, m, total_out, sum(in_rels) AS total_in
			
			// Update surviving node
			SET s.merged_from_ids = COALESCE(s.merged_from_ids, []) + $merged_id,
				s.updated_at = $updated_at
			
			// Mark merged node
			SET m.merged_into_id = $surviving_id
			
			// Delete merged node and its relationships
			DETACH DELETE m
			RETURN s
		`
		params := map[string]interface{}{
			"surviving_id": survivingID,
			"merged_id":    mergedID,
			"updated_at":   time.Now().Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	return err
}

// stringFromNeo4j safely extracts a string value from a Neo4j record.
func stringFromNeo4j(record *neo4j.Record, key string) string {
	val, ok := record.Get(key)
	if !ok || val == nil {
		return ""
	}
	s, ok := val.(string)
	if !ok {
		return ""
	}
	return s
}
