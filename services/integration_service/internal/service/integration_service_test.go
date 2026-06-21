package service_test

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/integration_service/internal/service"
	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := service.NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	providerMap := make(map[string]service.ProviderInfo)
	for _, p := range providers {
		providerMap[p.Name] = p
	}

	tests := []struct {
		name           string
		expectedStatus string
	}{
		{"23andMe", "AVAILABLE"},
		{"AncestryDNA", "AVAILABLE"},
		{"FTDNA", "AVAILABLE"},
		{"Ancestry", "STUB"},
		{"FamilySearch", "STUB"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p, exists := providerMap[tc.name]
			assert.True(t, exists, "provider should exist")
			assert.Equal(t, tc.expectedStatus, p.Status, "status should match")
		})
	}
}

func TestIntegrationService_SyncExternalData_DNA(t *testing.T) {
	svc := service.NewIntegrationService()

	tests := []struct {
		providerName string
	}{
		{providerName: "23andMe"},
		{providerName: "AncestryDNA"},
		{providerName: "FTDNA"},
	}

	for _, tc := range tests {
		t.Run(tc.providerName, func(t *testing.T) {
			res, err := svc.SyncExternalData(context.Background(), tc.providerName, nil)
			assert.NoError(t, err)
			assert.NotNil(t, res)
			assert.Equal(t, tc.providerName, res.Provider)
			assert.Equal(t, 1, res.RecordsFetched)
			assert.Equal(t, 1, res.RecordsMapped)
		})
	}
}
