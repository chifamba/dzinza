package service

import (
	"context"
	"fmt"
	"testing"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/google/uuid"
)

// MockRepository implements repository.Repository for testing
type MockRepository struct {
	persons map[uuid.UUID]*models.Person
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		persons: make(map[uuid.UUID]*models.Person),
	}
}

func (m *MockRepository) CreatePerson(ctx context.Context, person *models.Person) error {
	m.persons[person.ID] = person
	return nil
}

func (m *MockRepository) GetPersonByID(ctx context.Context, id uuid.UUID) (*models.Person, error) {
	if p, ok := m.persons[id]; ok {
		// Return a copy to simulate DB retrieval
		val := *p
		return &val, nil
	}
	return nil, fmt.Errorf("person not found")
}

func (m *MockRepository) UpdatePerson(ctx context.Context, person *models.Person) error {
	if _, ok := m.persons[person.ID]; !ok {
		return fmt.Errorf("person not found")
	}
	m.persons[person.ID] = person
	return nil
}

// Stub other methods to satisfy interface
func (m *MockRepository) CreateTree(ctx context.Context, tree *models.FamilyTree) error { return nil }
func (m *MockRepository) GetTreeByID(ctx context.Context, id string) (*models.FamilyTree, error) { return nil, nil }
func (m *MockRepository) ListTreesByOwner(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error) { return nil, nil }
func (m *MockRepository) DeletePerson(ctx context.Context, id uuid.UUID) error { return nil }
func (m *MockRepository) ListPersonsByTree(ctx context.Context, treeID string) ([]models.Person, error) { return nil, nil }
func (m *MockRepository) CreateRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string, metadata map[string]interface{}) error { return nil }
func (m *MockRepository) DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error { return nil }
func (m *MockRepository) CheckCircularReference(ctx context.Context, p1, p2 uuid.UUID, relType string) (bool, error) { return false, nil }
func (m *MockRepository) ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error) { return nil, nil }

func TestSyncWithProvider(t *testing.T) {
	repo := NewMockRepository()
	svc := NewDNAService(repo)

	// Setup Person
	personID := uuid.New()
	person := &models.Person{
		ID: personID,
		PrimaryName: models.Name{
			GivenName: "Test",
			Surname:   "User",
		},
	}
	repo.CreatePerson(context.Background(), person)

	// Link Test
	dnaTest := &models.DNATest{
		Provider: "Ancestry",
		KitID:    "KIT123",
	}
	err := svc.LinkDNATest(context.Background(), personID, dnaTest)
	if err != nil {
		t.Fatalf("LinkDNATest failed: %v", err)
	}

	// Verify linked
	tests, err := svc.GetDNATests(context.Background(), personID)
	if err != nil {
		t.Fatalf("GetDNATests failed: %v", err)
	}
	if len(tests) != 1 {
		t.Fatalf("expected 1 test, got %d", len(tests))
	}
	testID := tests[0].ID

	// Sync
	err = svc.SyncWithProvider(context.Background(), personID, testID)
	if err != nil {
		t.Fatalf("SyncWithProvider failed: %v", err)
	}

	// Verify updated
	updatedTests, _ := svc.GetDNATests(context.Background(), personID)
	result := updatedTests[0]

	if result.ResultURL == "" {
		t.Error("expected ResultURL to be updated")
	}
	if result.RawDataS3Key == "" {
		t.Error("expected RawDataS3Key to be updated")
	}
}
