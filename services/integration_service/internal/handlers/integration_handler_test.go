package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	r := gin.Default()
	svc := service.NewIntegrationService()
	h := NewIntegrationHandler(svc)

	r.POST("/api/v1/integration/sync", h.Sync)
	r.GET("/api/v1/integration/providers", h.ListProviders)
	r.POST("/api/v1/integration/webhook/:provider", h.Webhook)
	return r
}

func TestIntegrationHandler_ListProviders(t *testing.T) {
	r := setupRouter()

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/integration/providers", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestIntegrationHandler_Sync(t *testing.T) {
	r := setupRouter()

	payload := map[string]interface{}{
		"provider": "23andMe",
		"config":   map[string]string{"key": "value"},
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/integration/sync", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}


func TestIntegrationHandler_Webhook(t *testing.T) {
	r := setupRouter()

	req, _ := http.NewRequest(http.MethodPost, "/api/v1/integration/webhook/23andMe", bytes.NewBufferString(`{"event":"update"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}