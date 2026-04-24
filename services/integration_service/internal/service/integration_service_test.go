package service

import (
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService().(*integrationService)
	ctx := context.Background()
	config := map[string]string{}

	providersToTest := []struct {
		name          string
		expectedCount int
		expectedType  string
		checkRecord   func(*testing.T, InternalRecord)
	}{
		{
			name:          "23andMe",
			expectedCount: 1,
			expectedType:  "PERSON",
			checkRecord: func(t *testing.T, rec InternalRecord) {
				assert.Equal(t, "23andMe", rec.Extra["provider"])
				assert.Equal(t, "DNA Match", rec.Extra["dna_match_name"])
				assert.Equal(t, 150, rec.Extra["shared_cm"])
				assert.Equal(t, 0.85, rec.Extra["confidence"])
			},
		},
		{
			name:          "AncestryDNA",
			expectedCount: 2,
			expectedType:  "PERSON",
			checkRecord: func(t *testing.T, rec InternalRecord) {
				assert.Equal(t, "AncestryDNA", rec.Extra["provider"])
				// Match 1 or 2 based on shared_cm
				if shared, ok := rec.Extra["shared_cm"].(int); ok && shared == 245 {
					assert.Equal(t, "Ancestry Match 1", rec.Extra["dna_match_name"])
					assert.Equal(t, 12, rec.Extra["segments"])
					assert.Equal(t, "public", rec.Extra["tree_status"])
				} else if ok && shared == 110 {
					assert.Equal(t, "Ancestry Match 2", rec.Extra["dna_match_name"])
					assert.Equal(t, 6, rec.Extra["segments"])
					assert.Equal(t, "unlinked", rec.Extra["tree_status"])
				} else {
					t.Fatalf("unexpected shared_cm: %v", rec.Extra["shared_cm"])
				}
			},
		},
		{
			name:          "FTDNA",
			expectedCount: 1,
			expectedType:  "PERSON",
			checkRecord: func(t *testing.T, rec InternalRecord) {
				assert.Equal(t, "FTDNA", rec.Extra["provider"])
				assert.Equal(t, "FTDNA Match 1", rec.Extra["dna_match_name"])
				assert.Equal(t, 310, rec.Extra["shared_cm"])
				assert.Equal(t, "R-M269", rec.Extra["y_dna_haplogroup"])
				assert.Equal(t, "H1", rec.Extra["mt_dna_haplogroup"])
			},
		},
	}

	for _, tt := range providersToTest {
		t.Run(tt.name, func(t *testing.T) {
			// Test top-level sync call for counts
			result, err := svc.SyncExternalData(ctx, tt.name, config)
			require.NoError(t, err)
			require.NotNil(t, result)
			assert.Equal(t, tt.name, result.Provider)
			assert.Equal(t, tt.expectedCount, result.RecordsFetched)
			assert.Equal(t, tt.expectedCount, result.RecordsMapped)

			// Now test the underlying provider logic to ensure MapToInternal is working correctly
			provider := svc.providers[strings.ToLower(tt.name)]
			require.NotNil(t, provider)

			data, err := provider.FetchData(ctx, config)
			require.NoError(t, err)

			records, err := provider.MapToInternal(data)
			require.NoError(t, err)
			require.Len(t, records, tt.expectedCount)

			for _, rec := range records {
				assert.Equal(t, tt.expectedType, rec.Type)
				tt.checkRecord(t, rec)
			}
		})
	}
}
