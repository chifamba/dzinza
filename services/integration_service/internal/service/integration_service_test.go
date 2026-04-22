package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.Len(t, providers, 5)

	names := make(map[string]bool)
	for _, p := range providers {
		names[p.Name] = true
	}

	assert.True(t, names["FamilySearch"])
	assert.True(t, names["Ancestry"])
	assert.True(t, names["23andMe"])
	assert.True(t, names["AncestryDNA"])
	assert.True(t, names["FTDNA"])
}

func TestIntegrationService_SyncExternalData_FamilySearch(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	result, err := svc.SyncExternalData(ctx, "FamilySearch", config)
	require.NoError(t, err)

	assert.Equal(t, "FamilySearch", result.Provider)
	assert.Equal(t, 1, result.RecordsFetched)
	assert.Equal(t, 1, result.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_Ancestry(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	result, err := svc.SyncExternalData(ctx, "Ancestry", config)
	require.NoError(t, err)

	assert.Equal(t, "Ancestry", result.Provider)
	assert.Equal(t, 1, result.RecordsFetched)
	assert.Equal(t, 1, result.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_23andMe(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	result, err := svc.SyncExternalData(ctx, "23andMe", config)
	require.NoError(t, err)

	assert.Equal(t, "23andMe", result.Provider)
	assert.Equal(t, 1, result.RecordsFetched)
	assert.Equal(t, 1, result.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_AncestryDNA(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	result, err := svc.SyncExternalData(ctx, "AncestryDNA", config)
	require.NoError(t, err)

	assert.Equal(t, "AncestryDNA", result.Provider)
	assert.Equal(t, 1, result.RecordsFetched)
	assert.Equal(t, 1, result.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_FTDNA(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	result, err := svc.SyncExternalData(ctx, "FTDNA", config)
	require.NoError(t, err)

	assert.Equal(t, "FTDNA", result.Provider)
	assert.Equal(t, 1, result.RecordsFetched)
	assert.Equal(t, 1, result.RecordsMapped)
}

func TestIntegrationService_SyncExternalData_UnknownProvider(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"api_key": "dummy"}

	_, err := svc.SyncExternalData(ctx, "Unknown", config)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "unknown provider")
}
