package repository

import (
	"context"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/models"
)

type Repository interface {
	GetPerson(ctx context.Context, id string) (*models.Person, error)
	GetTree(ctx context.Context, id string) (*models.FamilyTree, error)
	GetParents(ctx context.Context, personID string) ([]*models.Person, error)
	GetChildren(ctx context.Context, personID string) ([]*models.Person, error)
	GetSpouses(ctx context.Context, personID string) ([]*models.Person, error)
	GetSiblings(ctx context.Context, personID string) ([]*models.Person, error)
	SearchPersons(ctx context.Context, name string, limit int) ([]*models.Person, error)
}
