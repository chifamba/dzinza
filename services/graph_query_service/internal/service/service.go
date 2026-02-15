package service

import (
	"context"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/models"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/repository"
)

type GraphQueryService interface {
	GetPerson(ctx context.Context, id string) (*models.Person, error)
	GetTree(ctx context.Context, id string) (*models.FamilyTree, error)
	GetParents(ctx context.Context, personID string) ([]*models.Person, error)
	GetChildren(ctx context.Context, personID string) ([]*models.Person, error)
	GetSpouses(ctx context.Context, personID string) ([]*models.Person, error)
	GetSiblings(ctx context.Context, personID string) ([]*models.Person, error)
	SearchPersons(ctx context.Context, name string, limit int) ([]*models.Person, error)
}

type graphQueryService struct {
	repo repository.Repository
}

func NewGraphQueryService(repo repository.Repository) GraphQueryService {
	return &graphQueryService{repo: repo}
}

func (s *graphQueryService) GetPerson(ctx context.Context, id string) (*models.Person, error) {
	return s.repo.GetPerson(ctx, id)
}

func (s *graphQueryService) GetTree(ctx context.Context, id string) (*models.FamilyTree, error) {
	return s.repo.GetTree(ctx, id)
}

func (s *graphQueryService) GetParents(ctx context.Context, personID string) ([]*models.Person, error) {
	return s.repo.GetParents(ctx, personID)
}

func (s *graphQueryService) GetChildren(ctx context.Context, personID string) ([]*models.Person, error) {
	return s.repo.GetChildren(ctx, personID)
}

func (s *graphQueryService) GetSpouses(ctx context.Context, personID string) ([]*models.Person, error) {
	return s.repo.GetSpouses(ctx, personID)
}

func (s *graphQueryService) GetSiblings(ctx context.Context, personID string) ([]*models.Person, error) {
	return s.repo.GetSiblings(ctx, personID)
}

func (s *graphQueryService) SearchPersons(ctx context.Context, name string, limit int) ([]*models.Person, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.repo.SearchPersons(ctx, name, limit)
}
