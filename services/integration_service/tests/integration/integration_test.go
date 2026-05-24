package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chifamba/dzinza/services/integration_service/internal/handlers"
	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_Sync(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()

	svc := service.NewIntegrationService()
	h := handlers.NewIntegrationHandler(svc)

	r.POST("/api/v1/integration/sync", h.Sync)

	tests := []struct {
		name         string
		provider     string
		expectedCode int
		expectedMap  int
	}{
		{
			name:         "23andMe Mock Data",
			provider:     "23andme", // Lowercase test
			expectedCode: http.StatusOK,
			expectedMap:  1,
		},
		{
			name:         "AncestryDNA Mock Data",
			provider:     "ancestrydna",
			expectedCode: http.StatusOK,
			expectedMap:  2,
		},
		{
			name:         "FTDNA Mock Data",
			provider:     "ftdna",
			expectedCode: http.StatusOK,
			expectedMap:  1,
		},
		{
			name:         "Invalid Provider",
			provider:     "unknown",
			expectedCode: http.StatusInternalServerError,
			expectedMap:  0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqBody := map[string]interface{}{
				"provider": tt.provider,
				"config":   map[string]string{},
			}
			jsonBody, _ := json.Marshal(reqBody)

			req, _ := http.NewRequest(http.MethodPost, "/api/v1/integration/sync", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedCode, w.Code)

			if tt.expectedCode == http.StatusOK {
				var response service.SyncResult
				err := json.Unmarshal(w.Body.Bytes(), &response)
				assert.NoError(t, err)
				assert.Equal(t, tt.provider, response.Provider)
				assert.Equal(t, tt.expectedMap, response.RecordsMapped)
			}
		})
	}
}

func TestIntegrationService_ListProviders(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test")
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()

	svc := service.NewIntegrationService()
	h := handlers.NewIntegrationHandler(svc)

	r.GET("/api/v1/integration/providers", h.ListProviders)

	req, _ := http.NewRequest(http.MethodGet, "/api/v1/integration/providers", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response []service.ProviderInfo
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)

	// Expect at least the 5 registered providers
	assert.GreaterOrEqual(t, len(response), 5)

	for _, p := range response {
		assert.Equal(t, "AVAILABLE", p.Status)
	}
}
