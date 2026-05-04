package service

import (
	"context"
	"testing"
	"github.com/stretchr/testify/assert"
)

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{"key": "value"}

	t.Run("ValidProvider", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "FamilySearch", config)
		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, "FamilySearch", res.Provider)
	})

	t.Run("InvalidProvider", func(t *testing.T) {
		res, err := svc.SyncExternalData(ctx, "UnknownProvider", config)
		assert.Error(t, err)
		assert.Nil(t, res)
	})
}
