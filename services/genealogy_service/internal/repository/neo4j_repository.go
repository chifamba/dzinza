package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

type neo4jRepository struct {
	driver neo4j.DriverWithContext
}

func NewNeo4jRepository(driver neo4j.DriverWithContext) Repository {
	return &neo4jRepository{driver: driver}
}

func (r *neo4jRepository) CreateTree(ctx context.Context, tree *models.FamilyTree) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			CREATE (t:FamilyTree {
				id: $id,
				owner_id: $owner_id,
				name: $name,
				description: $description,
				privacy_level: $privacy_level,
				created_at: $created_at,
				updated_at: $updated_at
			})
			RETURN t
		`
		params := map[string]interface{}{
			"id":            tree.ID,
			"owner_id":      tree.OwnerID.String(),
			"name":          tree.Name,
			"description":   tree.Description,
			"privacy_level": tree.PrivacyLevel,
			"created_at":    tree.CreatedAt.Format(time.RFC3339),
			"updated_at":    tree.UpdatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) GetTreeByID(ctx context.Context, id string) (*models.FamilyTree, error) {
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
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))
			updatedAt, _ := time.Parse(time.RFC3339, props["updated_at"].(string))

			return &models.FamilyTree{
				ID:           props["id"].(string),
				OwnerID:      ownerID,
				Name:         props["name"].(string),
				Description:  props["description"].(string),
				PrivacyLevel: props["privacy_level"].(string),
				CreatedAt:    createdAt,
				UpdatedAt:    updatedAt,
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

func (r *neo4jRepository) ListTreesByOwner(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (t:FamilyTree {owner_id: $owner_id}) RETURN t`
		res, err := tx.Run(ctx, query, map[string]interface{}{"owner_id": ownerID.String()})
		if err != nil {
			return nil, err
		}
		var trees []models.FamilyTree
		for res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			props := node.Props
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))
			updatedAt, _ := time.Parse(time.RFC3339, props["updated_at"].(string))

			trees = append(trees, models.FamilyTree{
				ID:           props["id"].(string),
				OwnerID:      ownerID,
				Name:         props["name"].(string),
				Description:  props["description"].(string),
				PrivacyLevel: props["privacy_level"].(string),
				CreatedAt:    createdAt,
				UpdatedAt:    updatedAt,
			})
		}
		return trees, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]models.FamilyTree), nil
}

func (r *neo4jRepository) CreatePerson(ctx context.Context, person *models.Person) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			CREATE (p:Person {
				id: $id,
				given_name: $given_name,
				surname: $surname,
				gender: $gender,
				birth_date_string: $birth_date_string,
				birth_place: $birth_place,
				is_living: $is_living,
				biography: $biography,
				clan: $clan,
				tribe: $tribe,
				created_at: $created_at,
				updated_at: $updated_at
			})
			WITH p
			MATCH (t:FamilyTree {id: $tree_id})
			CREATE (p)-[:MEMBER_OF]->(t)
			RETURN p
		`
		params := map[string]interface{}{
			"id":                person.ID.String(),
			"given_name":        person.PrimaryName.GivenName,
			"surname":           person.PrimaryName.Surname,
			"gender":            person.Gender,
			"birth_date_string": person.BirthDateString,
			"birth_place":       person.BirthPlace,
			"is_living":         person.IsLiving,
			"biography":         person.Biography,
			"clan":              person.Clan,
			"tribe":             person.Tribe,
			"created_at":        person.CreatedAt.Format(time.RFC3339),
			"updated_at":        person.UpdatedAt.Format(time.RFC3339),
			"tree_id":           person.TreeID,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) GetPersonByID(ctx context.Context, id uuid.UUID) (*models.Person, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (p:Person {id: $id})-[:MEMBER_OF]->(t:FamilyTree) RETURN p, t.id`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": id.String()})
		if err != nil {
			return nil, err
		}
		if res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			treeID := res.Record().Values[1].(string)
			props := node.Props
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))
			updatedAt, _ := time.Parse(time.RFC3339, props["updated_at"].(string))

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
				CreatedAt:       createdAt,
				UpdatedAt:       updatedAt,
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
	return result.(*models.Person), nil
}

func (r *neo4jRepository) UpdatePerson(ctx context.Context, person *models.Person) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p:Person {id: $id})
			SET p.given_name = $given_name,
				p.surname = $surname,
				p.gender = $gender,
				p.birth_date_string = $birth_date_string,
				p.birth_place = $birth_place,
				p.is_living = $is_living,
				p.biography = $biography,
				p.clan = $clan,
				p.tribe = $tribe,
				p.updated_at = $updated_at
			RETURN p
		`
		params := map[string]interface{}{
			"id":                person.ID.String(),
			"given_name":        person.PrimaryName.GivenName,
			"surname":           person.PrimaryName.Surname,
			"gender":            person.Gender,
			"birth_date_string": person.BirthDateString,
			"birth_place":       person.BirthPlace,
			"is_living":         person.IsLiving,
			"biography":         person.Biography,
			"clan":              person.Clan,
			"tribe":             person.Tribe,
			"updated_at":        person.UpdatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) DeletePerson(ctx context.Context, id uuid.UUID) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (p:Person {id: $id}) DETACH DELETE p`
		_, err := tx.Run(ctx, query, map[string]interface{}{"id": id.String()})
		return nil, err
	})
	return err
}

func (r *neo4jRepository) ListPersonsByTree(ctx context.Context, treeID string) ([]models.Person, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (p:Person)-[:MEMBER_OF]->(t:FamilyTree {id: $tree_id}) RETURN p`
		res, err := tx.Run(ctx, query, map[string]interface{}{"tree_id": treeID})
		if err != nil {
			return nil, err
		}
		var persons []models.Person
		for res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			props := node.Props
			id, _ := uuid.Parse(props["id"].(string))
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))
			updatedAt, _ := time.Parse(time.RFC3339, props["updated_at"].(string))

			persons = append(persons, models.Person{
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
				CreatedAt:       createdAt,
				UpdatedAt:       updatedAt,
			})
		}
		return persons, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]models.Person), nil
}

func (r *neo4jRepository) CreateRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string, metadata map[string]interface{}) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := fmt.Sprintf(`
			MATCH (a:Person {id: $id1}), (b:Person {id: $id2})
			MERGE (a)-[r:%s]->(b)
			SET r += $metadata
			RETURN r
		`, relType)
		params := map[string]interface{}{
			"id1":      p1.String(),
			"id2":      p2.String(),
			"metadata": metadata,
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := fmt.Sprintf(`
			MATCH (a:Person {id: $id1})-[r:%s]->(b:Person {id: $id2})
			DELETE r
		`, relType)
		params := map[string]interface{}{
			"id1": p1.String(),
			"id2": p2.String(),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) CheckCircularReference(ctx context.Context, p1, p2 uuid.UUID, relType string) (bool, error) {
	if relType != models.RelParentOf {
		return false, nil // Only PARENT_OF can cause simple circularity in genealogy (p1 is parent of p2)
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		// Check if p1 is already a descendant of p2
		query := `MATCH (p2:Person {id: $id2})-[:PARENT_OF*]->(p1:Person {id: $id1}) RETURN p1`
		res, err := tx.Run(ctx, query, map[string]interface{}{
			"id1": p1.String(),
			"id2": p2.String(),
		})
		if err != nil {
			return nil, err
		}
		return res.Next(ctx), nil
	})
	if err != nil {
		return false, err
	}
	return result.(bool), nil
}

func (r *neo4jRepository) ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p1:Person)-[:MEMBER_OF]->(t:FamilyTree {id: $tree_id}),
			      (p2:Person)-[:MEMBER_OF]->(t)
			MATCH (p1)-[r]->(p2)
			WHERE type(r) <> 'MEMBER_OF'
			RETURN p1.id, p2.id, type(r), properties(r)
		`
		res, err := tx.Run(ctx, query, map[string]interface{}{"tree_id": treeID})
		if err != nil {
			return nil, err
		}
		var rels []models.Relationship
		for res.Next(ctx) {
			values := res.Record().Values
			p1ID, _ := uuid.Parse(values[0].(string))
			p2ID, _ := uuid.Parse(values[1].(string))
			relType := values[2].(string)
			
			var props map[string]interface{}
			if values[3] != nil {
				props = values[3].(map[string]interface{})
			}

			rels = append(rels, models.Relationship{
				Person1ID: p1ID,
				Person2ID: p2ID,
				Type:      relType,
				Metadata:  props,
			})
		}
		return rels, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]models.Relationship), nil
}

func (r *neo4jRepository) LinkDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (p:Person {id: $person_id})
			CREATE (d:DNATest {
				id: $id,
				person_id: $person_id,
				provider: $provider,
				test_type: $test_type,
				kit_id: $kit_id,
				result_url: $result_url,
				haplogroup_p: $haplogroup_p,
				haplogroup_m: $haplogroup_m,
				raw_data_s3_key: $raw_data_s3_key,
				created_at: $created_at
			})
			CREATE (p)-[:HAS_DNA_TEST]->(d)
			RETURN d
		`
		params := map[string]interface{}{
			"id":              test.ID.String(),
			"person_id":       personID.String(),
			"provider":        test.Provider,
			"test_type":       test.TestType,
			"kit_id":          test.KitID,
			"result_url":      test.ResultURL,
			"haplogroup_p":    test.HaplogroupP,
			"haplogroup_m":    test.HaplogroupM,
			"raw_data_s3_key": test.RawDataS3Key,
			"created_at":      test.CreatedAt.Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})
	return err
}

func (r *neo4jRepository) GetDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (p:Person {id: $person_id})-[:HAS_DNA_TEST]->(d:DNATest) RETURN d`
		res, err := tx.Run(ctx, query, map[string]interface{}{"person_id": personID.String()})
		if err != nil {
			return nil, err
		}
		var tests []models.DNATest
		for res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			props := node.Props
			id, _ := uuid.Parse(props["id"].(string))
			pID, _ := uuid.Parse(props["person_id"].(string))
			createdAt, _ := time.Parse(time.RFC3339, props["created_at"].(string))

			tests = append(tests, models.DNATest{
				ID:             id,
				PersonID:       pID,
				Provider:       props["provider"].(string),
				TestType:       props["test_type"].(string),
				KitID:          props["kit_id"].(string),
				ResultURL:      props["result_url"].(string),
				HaplogroupP:    props["haplogroup_p"].(string),
				HaplogroupM:    props["haplogroup_m"].(string),
				RawDataS3Key:   props["raw_data_s3_key"].(string),
				CreatedAt:      createdAt,
			})
		}
		return tests, nil
	})
	if err != nil {
		return nil, err
	}
	return result.([]models.DNATest), nil
}
