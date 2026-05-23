package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	assert.Len(t, providers, 5)

	providerStatus := make(map[string]string)
	for _, p := range providers {
		providerStatus[p.Name] = p.Status
	}

	assert.Equal(t, "AVAILABLE", providerStatus["23andMe"])
	assert.Equal(t, "AVAILABLE", providerStatus["AncestryDNA"])
	assert.Equal(t, "AVAILABLE", providerStatus["FTDNA"])
	assert.Equal(t, "STUB", providerStatus["FamilySearch"])
	assert.Equal(t, "STUB", providerStatus["Ancestry"])
}

func TestIntegrationService_SyncExternalData_MockData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	t.Run("23andMe", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "23andMe", map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, "23andMe", res.Provider)
		assert.Equal(t, 1, res.RecordsFetched)
		assert.Equal(t, 1, res.RecordsMapped)
	})

	t.Run("AncestryDNA", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "AncestryDNA", map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, "AncestryDNA", res.Provider)
		assert.Equal(t, 1, res.RecordsFetched)
		assert.Equal(t, 1, res.RecordsMapped)
	})

	t.Run("FTDNA", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "FTDNA", map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, "FTDNA", res.Provider)
		assert.Equal(t, 1, res.RecordsFetched)
		assert.Equal(t, 1, res.RecordsMapped)
	})

	t.Run("FamilySearch", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "FamilySearch", map[string]string{})
		assert.NoError(t, err)
		assert.Equal(t, "FamilySearch", res.Provider)
		assert.Equal(t, 1, res.RecordsFetched)
		assert.Equal(t, 1, res.RecordsMapped)
	})
}
