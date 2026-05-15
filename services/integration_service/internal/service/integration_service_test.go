package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.NotEmpty(t, providers)

	// Map to easily verify statuses
	statusMap := make(map[string]string)
	for _, p := range providers {
		statusMap[p.Name] = p.Status
	}

	assert.Equal(t, "AVAILABLE", statusMap["23andMe"])
	assert.Equal(t, "AVAILABLE", statusMap["AncestryDNA"])
	assert.Equal(t, "AVAILABLE", statusMap["FTDNA"])
	assert.Equal(t, "STUB", statusMap["FamilySearch"])
	assert.Equal(t, "STUB", statusMap["Ancestry"])
}

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	// Test a valid provider (e.g. 23andMe)
	res, err := svc.SyncExternalData(ctx, "23andme", nil)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "23andme", res.Provider)
	assert.Equal(t, 1, res.RecordsFetched)
	assert.Equal(t, 1, res.RecordsMapped)

	// Test unknown provider
	_, err = svc.SyncExternalData(ctx, "Unknown", nil)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown provider")
}


func TestIntegrationService_Webhook(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	err := svc.HandleWebhook(ctx, "23andme", []byte(`{"event":"update"}`))
	assert.NoError(t, err)
}

func TestIntegrationService_SyncExternalData_DNA_Providers(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	// Test AncestryDNA
	res, err := svc.SyncExternalData(ctx, "ancestrydna", nil)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "ancestrydna", res.Provider)
	assert.Equal(t, 2, res.RecordsFetched)
	assert.Equal(t, 2, res.RecordsMapped)

	// Test FTDNA
	res, err = svc.SyncExternalData(ctx, "ftdna", nil)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, "ftdna", res.Provider)
	assert.Equal(t, 1, res.RecordsFetched)
	assert.Equal(t, 1, res.RecordsMapped)
}