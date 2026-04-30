package repository

import (
	"context"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/google/uuid"
)

type Repository interface {
	// Tree operations
	CreateTree(ctx context.Context, tree *models.FamilyTree) error
	GetTreeByID(ctx context.Context, id string) (*models.FamilyTree, error)
	ListTreesByOwner(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error)

	// Person operations
	CreatePerson(ctx context.Context, person *models.Person) error
	GetPersonByID(ctx context.Context, id uuid.UUID) (*models.Person, error)
	UpdatePerson(ctx context.Context, person *models.Person) error
	DeletePerson(ctx context.Context, id uuid.UUID) error
	ListPersonsByTree(ctx context.Context, treeID string) ([]models.Person, error)

	// Relationship operations
	CreateRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string, metadata map[string]interface{}) error
	DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error
	CheckCircularReference(ctx context.Context, p1, p2 uuid.UUID, relType string) (bool, error)
	ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error)

	// DNA operations
	CreateDNATest(ctx context.Context, personID uuid.UUID, test *models.DNATest) error
	ListDNATests(ctx context.Context, personID uuid.UUID) ([]models.DNATest, error)
}
