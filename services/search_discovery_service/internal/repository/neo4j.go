package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/search_discovery_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type Neo4jRepository interface {
	GetPersonByID(ctx context.Context, id string) (*models.PersonIndex, error)
}

type neo4jRepo struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) Neo4jRepository {
	return &neo4jRepo{driver: driver}
}

func (r *neo4jRepo) GetPersonByID(ctx context.Context, id string) (*models.PersonIndex, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (p:Person {id: $id})-[:MEMBER_OF]->(t:FamilyTree) RETURN p, t.id`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": id})
		if err != nil {
			return nil, err
		}
		if res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			treeID := res.Record().Values[1].(string)
			props := node.Props
			
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))
			updatedAt, _ := time.Parse(time.RFC3339, props["updated_at"].(string))

			person := &models.PersonIndex{
				ID:     id,
				TreeID: treeID,
				PrimaryName: models.Name{
					GivenName: props["given_name"].(string),
					Surname:   props["surname"].(string),
				},
				Gender:     props["gender"].(string),
				BirthDate:  props["birth_date_string"].(string),
				BirthPlace: props["birth_place"].(string),
				IsLiving:   props["is_living"].(bool),
				Biography:  props["biography"].(string),
				Clan:       props["clan"].(string),
				Tribe:      props["tribe"].(string),
				CreatedAt:  createdAt,
				UpdatedAt:  updatedAt,
			}
			return person, nil
		}
		return nil, nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get person from neo4j: %w", err)
	}
	if result == nil {
		return nil, nil
	}
	return result.(*models.PersonIndex), nil
}
