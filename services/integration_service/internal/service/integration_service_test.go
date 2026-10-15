package service

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestIntegrationService(t *testing.T) {
	svc := NewIntegrationService()

	t.Run("ListProviders", func(t *testing.T) {
		providers := svc.ListProviders(context.Background())
		assert.NotEmpty(t, providers)
	})

	t.Run("SyncExternalData_AncestryDNA", func(t *testing.T) {
		result, err := svc.SyncExternalData(context.Background(), "AncestryDNA", nil)
		assert.NoError(t, err)
		assert.Equal(t, "AncestryDNA", result.Provider)
		assert.Equal(t, 2, result.RecordsFetched)
		assert.Equal(t, 2, result.RecordsMapped)
	})

	t.Run("SyncExternalData_FTDNA", func(t *testing.T) {
		result, err := svc.SyncExternalData(context.Background(), "FTDNA", nil)
		assert.NoError(t, err)
		assert.Equal(t, "FTDNA", result.Provider)
		assert.Equal(t, 1, result.RecordsFetched)
		assert.Equal(t, 1, result.RecordsMapped)
	})
}
