package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/chifamba/dzinza/services/auth_service/internal/handlers"
	"github.com/chifamba/dzinza/services/auth_service/internal/models"
	"github.com/chifamba/dzinza/services/auth_service/internal/repository"
	"github.com/chifamba/dzinza/services/auth_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	rediscontainer "github.com/testcontainers/testcontainers-go/modules/redis"
	"github.com/testcontainers/testcontainers-go/wait"
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestAuthServiceIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	ctx := context.Background()

	// 1. Start Postgres Container
	pgContainer, err := postgres.RunContainer(ctx,
		testcontainers.WithImage("postgres:17.8-alpine"),
		postgres.WithDatabase("auth_db"),
		postgres.WithUsername("test_user"),
		postgres.WithPassword("test_pass"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second)),
	)
	require.NoError(t, err)
	defer func() {
		if err := pgContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate pgContainer: %s", err)
		}
	}()

	pgConnStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	// 2. Start Redis Container
	redisContainer, err := rediscontainer.RunContainer(ctx,
		testcontainers.WithImage("redis:8.6.0-alpine"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("Ready to accept connections").
				WithStartupTimeout(30*time.Second)),
	)
	require.NoError(t, err)
	defer func() {
		if err := redisContainer.Terminate(ctx); err != nil {
			t.Logf("failed to terminate redisContainer: %s", err)
		}
	}()

	redisHost, err := redisContainer.Host(ctx)
	require.NoError(t, err)
	redisPort, err := redisContainer.MappedPort(ctx, "6379")
	require.NoError(t, err)

	// 3. Setup Database
	db, err := gorm.Open(gormpostgres.Open(pgConnStr), &gorm.Config{})
	require.NoError(t, err)
	err = db.AutoMigrate(&models.User{}, &models.Role{}, &models.UserTreeRole{})
	require.NoError(t, err)

	// Seed roles
	roles := []models.Role{
		{Name: "admin", Description: "Platform Admin"},
		{Name: "moderator", Description: "Content Moderator"},
		{Name: "user", Description: "Standard User"},
	}
	for _, r := range roles {
		db.Create(&r)
	}

	// 4. Setup Redis
	rdb := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", redisHost, redisPort.Port()),
	})

	// 5. Setup App
	cfg := &config.Config{
		JWTSecret:        "test-secret",
		JWTRefreshSecret: "test-refresh-secret",
	}
	repo := repository.NewPostgresRepository(db)
	svc := service.NewAuthService(repo, cfg)
	handler := handlers.NewAuthHandler(svc)

	gin.SetMode(gin.TestMode)
	router := gin.New()
	handlers.RegisterRoutes(router, handler, cfg, rdb)

	// 6. Run Tests
	t.Run("FullAuthFlow", func(t *testing.T) {
		// A. Register
		regReq := models.RegisterRequest{
			Email:    "test@example.com",
			Password: "Password123!",
			Name:     "Test User",
		}
		jsonReq, _ := json.Marshal(regReq)
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(jsonReq))
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusCreated, w.Code)

		// B. Login
		loginReq := models.LoginRequest{
			Email:    "test@example.com",
			Password: "Password123!",
		}
		jsonReq, _ = json.Marshal(loginReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/login", bytes.NewBuffer(jsonReq))
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var tokenRes models.TokenResponse
		err = json.Unmarshal(w.Body.Bytes(), &tokenRes)
		assert.NoError(t, err)
		assert.NotEmpty(t, tokenRes.AccessToken)
		assert.NotEmpty(t, tokenRes.RefreshToken)

		// C. Refresh Token
		refreshReq := models.RefreshTokenRequest{
			RefreshToken: tokenRes.RefreshToken,
		}
		jsonReq, _ = json.Marshal(refreshReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/refresh-token", bytes.NewBuffer(jsonReq))
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var refreshRes models.TokenResponse
		err = json.Unmarshal(w.Body.Bytes(), &refreshRes)
		assert.NoError(t, err)
		assert.NotEmpty(t, refreshRes.AccessToken)

		// D. Assign Role (Needs admin role)
		// Get user ID
		var user models.User
		db.Where("email = ?", "test@example.com").First(&user)
		
		// Manually assign admin role to the user so they can access admin routes
		adminRole, _ := repo.GetRoleByName(ctx, "admin")
		err = repo.AssignRoleToUser(ctx, user.ID, adminRole.ID)
		require.NoError(t, err)

		// We need a NEW login to get a token with the new role
		loginReqJson, _ := json.Marshal(loginReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/login", bytes.NewBuffer(loginReqJson))
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		json.Unmarshal(w.Body.Bytes(), &tokenRes)

		roleReq := models.RoleRequest{
			UserID: user.ID.String(),
			Role:   "moderator",
		}
		jsonReq, _ = json.Marshal(roleReq)
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/admin/assign-role", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenRes.AccessToken)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		
		// Verify role assigned
		db.Preload("Roles").First(&user, "id = ?", user.ID)
		hasModerator := false
		for _, r := range user.Roles {
			if r.Name == "moderator" {
				hasModerator = true
				break
			}
		}
		assert.True(t, hasModerator)

		// E. Revoke Role
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/admin/revoke-role", bytes.NewBuffer(jsonReq))
		req.Header.Set("Authorization", "Bearer "+tokenRes.AccessToken)
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		// Verify role revoked
		db.Preload("Roles").First(&user, "id = ?", user.ID)
		hasModerator = false
		for _, r := range user.Roles {
			if r.Name == "moderator" {
				hasModerator = true
				break
			}
		}
		assert.False(t, hasModerator)
	})
}

func TestMain(m *testing.M) {
	// Set any environment variables needed for tests
	os.Exit(m.Run())
}
