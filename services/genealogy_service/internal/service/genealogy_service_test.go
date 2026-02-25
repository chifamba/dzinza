package service

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository
type MockRepository struct {
	mock.Mock
}

// Implement required methods of Repository interface
func (m *MockRepository) CreateTree(ctx context.Context, tree *models.FamilyTree) error {
	args := m.Called(ctx, tree)
	return args.Error(0)
}
func (m *MockRepository) GetTreeByID(ctx context.Context, id string) (*models.FamilyTree, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.FamilyTree), args.Error(1)
}
func (m *MockRepository) ListTreesByOwner(ctx context.Context, ownerID uuid.UUID) ([]models.FamilyTree, error) {
	args := m.Called(ctx, ownerID)
	return args.Get(0).([]models.FamilyTree), args.Error(1)
}
func (m *MockRepository) CreatePerson(ctx context.Context, person *models.Person) error {
	args := m.Called(ctx, person)
	return args.Error(0)
}
func (m *MockRepository) GetPersonByID(ctx context.Context, id uuid.UUID) (*models.Person, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Person), args.Error(1)
}
func (m *MockRepository) UpdatePerson(ctx context.Context, person *models.Person) error {
	args := m.Called(ctx, person)
	return args.Error(0)
}
func (m *MockRepository) DeletePerson(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
func (m *MockRepository) ListPersonsByTree(ctx context.Context, treeID string) ([]models.Person, error) {
	args := m.Called(ctx, treeID)
	return args.Get(0).([]models.Person), args.Error(1)
}
func (m *MockRepository) CreateRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string, metadata map[string]interface{}) error {
	args := m.Called(ctx, p1, p2, relType, metadata)
	return args.Error(0)
}
func (m *MockRepository) DeleteRelationship(ctx context.Context, p1, p2 uuid.UUID, relType string) error {
	args := m.Called(ctx, p1, p2, relType)
	return args.Error(0)
}
func (m *MockRepository) ListRelationshipsByTree(ctx context.Context, treeID string) ([]models.Relationship, error) {
	args := m.Called(ctx, treeID)
	return args.Get(0).([]models.Relationship), args.Error(1)
}
func (m *MockRepository) CheckCircularReference(ctx context.Context, p1, p2 uuid.UUID, relType string) (bool, error) {
	args := m.Called(ctx, p1, p2, relType)
	return args.Bool(0), args.Error(1)
}

// MockBus
type MockBus struct {
	mock.Mock
}
func (m *MockBus) Publish(ctx context.Context, topic events.EventType, payload interface{}) error {
	args := m.Called(ctx, topic, payload)
	return args.Error(0)
}
func (m *MockBus) Subscribe(ctx context.Context, topic events.EventType) (<-chan string, error) {
	args := m.Called(ctx, topic)
	return args.Get(0).(<-chan string), args.Error(1)
}

func TestApplySuggestion_UpdatePerson(t *testing.T) {
	mockRepo := new(MockRepository)
	mockBus := new(MockBus)
	svc := NewGenealogyService(mockRepo, mockBus)

	personID := uuid.New()
	targetID := personID.String()

	updateReq := models.CreatePersonRequest{
		PrimaryName: models.Name{GivenName: "NewName", Surname: "NewSurname"},
		Gender:      "MALE",
	}
	updateReqBytes, _ := json.Marshal(updateReq)

	payload := models.SuggestionPayload{
		Action: "UPDATE_PERSON",
		Data:   json.RawMessage(updateReqBytes),
	}
	payloadBytes, _ := json.Marshal(payload)

	// Expect GetPerson
	existingPerson := &models.Person{ID: personID, PrimaryName: models.Name{GivenName: "Old", Surname: "Name"}}
	mockRepo.On("GetPersonByID", mock.Anything, personID).Return(existingPerson, nil)

	// Expect UpdatePerson
	mockRepo.On("UpdatePerson", mock.Anything, mock.MatchedBy(func(p *models.Person) bool {
		return p.ID == personID && p.PrimaryName.GivenName == "NewName"
	})).Return(nil)

	// Expect Event Publish
	mockBus.On("Publish", mock.Anything, events.PersonUpdated, mock.Anything).Return(nil)

	err := svc.ApplySuggestion(context.Background(), targetID, string(payloadBytes))
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
	mockBus.AssertExpectations(t)
}

func TestApplySuggestion_CreateRelationship(t *testing.T) {
	mockRepo := new(MockRepository)
	mockBus := new(MockBus)
	svc := NewGenealogyService(mockRepo, mockBus)

	p1 := uuid.New()
	p2 := uuid.New()

	createRelReq := models.CreateRelationshipRequest{
		Person1ID: p1.String(),
		Person2ID: p2.String(),
		Type:      "PARENT_OF",
	}
	createRelReqBytes, _ := json.Marshal(createRelReq)

	payload := models.SuggestionPayload{
		Action: "CREATE_RELATIONSHIP",
		Data:   json.RawMessage(createRelReqBytes),
	}
	payloadBytes, _ := json.Marshal(payload)

	// Expect CheckCircularReference
	mockRepo.On("CheckCircularReference", mock.Anything, p1, p2, "PARENT_OF").Return(false, nil)

	// Expect CreateRelationship
	mockRepo.On("CreateRelationship", mock.Anything, p1, p2, "PARENT_OF", mock.Anything).Return(nil)

	// Expect Event Publish
	mockBus.On("Publish", mock.Anything, events.RelationshipCreated, mock.Anything).Return(nil)

	err := svc.ApplySuggestion(context.Background(), "", string(payloadBytes)) // targetID ignored for create relationship
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
	mockBus.AssertExpectations(t)
}
