package service

import (
	"context"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/google/uuid"
)

type Service interface {
	// Tree management
	CreateTree(ctx context.Context, ownerID uuid.UUID, req models.CreateTreeRequest) (*models.FamilyTree, error)
	GetTree(ctx context.Context, id string) (*models.FamilyTree, error)
	ListUserTrees(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error)

	// Person management
	AddPerson(ctx context.Context, req models.CreatePersonRequest) (*models.Person, error)
	GetPerson(ctx context.Context, id uuid.UUID) (*models.Person, error)
	UpdatePerson(ctx context.Context, id uuid.UUID, req models.CreatePersonRequest) (*models.Person, error)
	DeletePerson(ctx context.Context, id uuid.UUID) error
	ListTreePersons(ctx context.Context, treeID string) ([]models.Person, error)

	// Relationship management
	CreateRelationship(ctx context.Context, req models.CreateRelationshipRequest) error
	DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error
	ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error)

	// GEDCOM operations
	ImportGEDCOM(ctx context.Context, treeID string, data []byte) (*models.ImportSummary, error)
	ExportGEDCOM(ctx context.Context, treeID string) ([]byte, error)

	// Verification integration
	ApplySuggestion(ctx context.Context, targetID string, payload string) error
}
