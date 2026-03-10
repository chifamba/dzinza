package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/handlers"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/repository"
	"github.com/chifamba/dzinza/services/genealogy_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/events"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	neo4jcontainer "github.com/testcontainers/testcontainers-go/modules/neo4j"
)

func TestGenealogyServiceIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	ctx := context.Background()

	// 1. Start Neo4j Container
	neo4jContainer, err := neo4jcontainer.RunContainer(ctx,
		testcontainers.WithImage("neo4j:5.12"),
		neo4jcontainer.WithAdminPassword("testpassword"),
	)
	require.NoError(t, err)
	defer func() {
		if err := neo4jContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate neo4jContainer: %s", err)
		}
	}()

	boltURI, err := neo4jContainer.BoltUrl(ctx)
	require.NoError(t, err)

	// 2. Setup Neo4j Driver
	driver, err := neo4j.NewDriverWithContext(boltURI, neo4j.BasicAuth("neo4j", "testpassword", ""))
	require.NoError(t, err)
	defer driver.Close(ctx)

	// 3. Setup App
	jwtSecret := "test-secret"
	repo := repository.NewNeo4jRepository(driver)

	// Mock event bus for tests
	eventBus := &mockBus{}
	svc := service.NewGenealogyService(repo, eventBus)
	handler := handlers.NewGenealogyHandler(svc)
	dnaHandler := handlers.NewDNAHandler(service.NewDNAService(repo))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	handlers.RegisterRoutes(router, handler, dnaHandler, jwtSecret)

	// Helper to generate token
	ownerID := uuid.New()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": ownerID.String(),
		"roles":   []string{"user"},
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte(jwtSecret))

	// 4. Run Tests
	t.Run("FullGenealogyFlow", func(t *testing.T) {
		// A. Create Tree
		treeReq := models.CreateTreeRequest{
			Name:         "My Family Tree",
			Description:  "Ancestors from Zimbabwe",
			PrivacyLevel: "PUBLIC",
		}
		jsonReq, _ := json.Marshal(treeReq)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/familytrees", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)

		var tree models.FamilyTree
		json.Unmarshal(w.Body.Bytes(), &tree)
		assert.NotEmpty(t, tree.ID)

		// B. Add Persons
		person1 := models.CreatePersonRequest{
			TreeID:      tree.ID,
			PrimaryName: models.Name{GivenName: "John", Surname: "Doe"},
			Gender:      "MALE",
		}
		jsonReq, _ = json.Marshal(person1)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/persons", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)
		var p1 models.Person
		json.Unmarshal(w.Body.Bytes(), &p1)

		person2 := models.CreatePersonRequest{
			TreeID:      tree.ID,
			PrimaryName: models.Name{GivenName: "Jane", Surname: "Doe"},
			Gender:      "FEMALE",
		}
		jsonReq, _ = json.Marshal(person2)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/persons", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)
		var p2 models.Person
		json.Unmarshal(w.Body.Bytes(), &p2)

		// C. Create Relationship (Parent-Child)
		relReq := models.CreateRelationshipRequest{
			Person1ID: p1.ID.String(),
			Person2ID: p2.ID.String(),
			Type:      "PARENT_OF",
		}
		jsonReq, _ = json.Marshal(relReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/relationships", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)

		// D. Detect Circular Reference
		badRelReq := models.CreateRelationshipRequest{
			Person1ID: p2.ID.String(),
			Person2ID: p1.ID.String(),
			Type:      "PARENT_OF",
		}
		jsonReq, _ = json.Marshal(badRelReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/relationships", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenString)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusConflict, w.Code) // Should fail due to circular ref
	})
}

func TestMain(m *testing.M) {
	os.Exit(m.Run())
}

// mockBus implements events.Bus for testing
type mockBus struct{}

func (m *mockBus) Publish(ctx context.Context, eventType events.EventType, payload interface{}) error {
	return nil
}

func (m *mockBus) Subscribe(ctx context.Context, eventType events.EventType) (<-chan string, error) {
	return nil, nil
}

func (m *mockBus) Close() error {
	return nil
}
