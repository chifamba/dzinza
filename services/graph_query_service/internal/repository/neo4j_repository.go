package repository

import (
	"context"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/models"
	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type neo4jRepository struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) Repository {
	return &neo4jRepository{driver: driver}
}

func (r *neo4jRepository) GetPerson(ctx context.Context, id string) (*models.Person, error) {
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
			return mapNodeToPerson(node, treeID), nil
		}
		return nil, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}
	return result.(*models.Person), nil
}

func (r *neo4jRepository) GetTree(ctx context.Context, id string) (*models.FamilyTree, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (t:FamilyTree {id: $id}) RETURN t`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": id})
		if err != nil {
			return nil, err
		}
		if res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			props := node.Props
			ownerID, _ := uuid.Parse(props["owner_id"].(string))
			return &models.FamilyTree{
				ID:          props["id"].(string),
				Name:        props["name"].(string),
				Description: props["description"].(string),
				OwnerID:     ownerID,
			}, nil
		}
		return nil, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}
	return result.(*models.FamilyTree), nil
}

func (r *neo4jRepository) GetParents(ctx context.Context, personID string) ([]*models.Person, error) {
	return r.getRelatedPersons(ctx, personID, "MATCH (p:Person {id: $id})<-[:PARENT_OF]-(related:Person)-[:MEMBER_OF]->(t:FamilyTree) RETURN related, t.id")
}

func (r *neo4jRepository) GetChildren(ctx context.Context, personID string) ([]*models.Person, error) {
	return r.getRelatedPersons(ctx, personID, "MATCH (p:Person {id: $id})-[:PARENT_OF]->(related:Person)-[:MEMBER_OF]->(t:FamilyTree) RETURN related, t.id")
}

func (r *neo4jRepository) GetSpouses(ctx context.Context, personID string) ([]*models.Person, error) {
	return r.getRelatedPersons(ctx, personID, "MATCH (p:Person {id: $id})-[:SPOUSE_OF]-(related:Person)-[:MEMBER_OF]->(t:FamilyTree) RETURN related, t.id")
}

func (r *neo4jRepository) GetSiblings(ctx context.Context, personID string) ([]*models.Person, error) {
	return r.getRelatedPersons(ctx, personID, "MATCH (p:Person {id: $id})<-[:PARENT_OF]-(parent:Person)-[:PARENT_OF]->(related:Person)-[:MEMBER_OF]->(t:FamilyTree) WHERE related.id <> $id RETURN DISTINCT related, t.id")
}

func (r *neo4jRepository) SearchPersons(ctx context.Context, name string, limit int) ([]*models.Person, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p:Person)-[:MEMBER_OF]->(t:FamilyTree)
			WHERE p.given_name CONTAINS $name OR p.surname CONTAINS $name
			RETURN p, t.id
			LIMIT $limit
		`
		res, err := tx.Run(ctx, query, map[string]interface{}{"name": name, "limit": limit})
		if err != nil {
			return nil, err
		}
		var persons []*models.Person
		for res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			treeID := res.Record().Values[1].(string)
			persons = append(persons, mapNodeToPerson(node, treeID))
		}
		return persons, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]*models.Person), nil
}

func (r *neo4jRepository) getRelatedPersons(ctx context.Context, personID string, query string) ([]*models.Person, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": personID})
		if err != nil {
			return nil, err
		}
		var persons []*models.Person
		for res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			treeID := res.Record().Values[1].(string)
			persons = append(persons, mapNodeToPerson(node, treeID))
		}
		return persons, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]*models.Person), nil
}

func mapNodeToPerson(node neo4j.Node, treeID string) *models.Person {
	props := node.Props
	id, _ := uuid.Parse(props["id"].(string))
	return &models.Person{
		ID: id,
		PrimaryName: models.Name{
			GivenName: props["given_name"].(string),
			Surname:   props["surname"].(string),
		},
		Gender:          props["gender"].(string),
		BirthDateString: props["birth_date_string"].(string),
		BirthPlace:      props["birth_place"].(string),
		IsLiving:        props["is_living"].(bool),
		Biography:       props["biography"].(string),
		Clan:            props["clan"].(string),
		Tribe:           props["tribe"].(string),
		TreeID:          treeID,
	}
}
