package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Fatalf("expected 5 providers, got %d", len(providers))
	}

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		if !ok {
			t.Errorf("unexpected provider: %s", p.Name)
			continue
		}

		if p.Status != expectedStatus {
			t.Errorf("expected status %s for provider %s, got %s", expectedStatus, p.Name, p.Status)
		}
	}
}

func TestSyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{}

	tests := []struct {
		name         string
		providerName string
		expectType   string
		expectName   string
		expectLen    int
	}{
		{
			name:         "23andMe",
			providerName: "23andMe",
			expectType:   "PERSON",
			expectName:   "DNA Match",
			expectLen:    1,
		},
		{
			name:         "AncestryDNA",
			providerName: "AncestryDNA",
			expectType:   "PERSON",
			expectName:   "Ancestry Match",
			expectLen:    1,
		},
		{
			name:         "FTDNA",
			providerName: "FTDNA",
			expectType:   "PERSON",
			expectName:   "FTDNA Match",
			expectLen:    1,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tc.providerName, config)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if result.Provider != tc.providerName {
				t.Errorf("expected provider %s, got %s", tc.providerName, result.Provider)
			}

			if result.RecordsMapped != tc.expectLen {
				t.Errorf("expected %d records mapped, got %d", tc.expectLen, result.RecordsMapped)
			}

            // To test mapping output exactly, we'd need to mock or reach inside providers map, but
            // integrationService unexports the providers map and SyncExternalData just returns a Summary.
            // Let's test the mapping function directly for these providers just to be sure.

            var provider ExternalProvider
            switch tc.providerName {
            case "23andMe":
                provider = &dna23AndMeProvider{}
            case "AncestryDNA":
                provider = &dnaAncestryProvider{}
            case "FTDNA":
                provider = &ftDNAProvider{}
            }

            data, _ := provider.FetchData(ctx, config)
            records, err := provider.MapToInternal(data)

            if err != nil {
                t.Fatalf("unexpected mapping error: %v", err)
            }

            if len(records) != tc.expectLen {
                t.Fatalf("expected %d records, got %d", tc.expectLen, len(records))
            }

            if records[0].Type != tc.expectType {
                t.Errorf("expected type %s, got %s", tc.expectType, records[0].Type)
            }

            if records[0].Extra["dna_match_name"] != tc.expectName {
                 t.Errorf("expected name %s, got %s", tc.expectName, records[0].Extra["dna_match_name"])
            }
		})
	}
}
