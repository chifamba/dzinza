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

	for _, p := range providers {
		switch p.Name {
		case "23andMe", "AncestryDNA", "FTDNA":
			if p.Status != "AVAILABLE" {
				t.Errorf("expected %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
		case "FamilySearch", "Ancestry":
			if p.Status != "STUB" {
				t.Errorf("expected %s to be STUB, got %s", p.Name, p.Status)
			}
		default:
			t.Errorf("unexpected provider: %s", p.Name)
		}
	}
}

func TestSyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	tests := []struct {
		name          string
		provider      string
		expectedFetch int
		expectedMap   int
		expectErr     bool
	}{
		{
			name:          "Sync 23andMe",
			provider:      "23andme",
			expectedFetch: 1,
			expectedMap:   1,
			expectErr:     false,
		},
		{
			name:          "Sync AncestryDNA",
			provider:      "ancestrydna",
			expectedFetch: 1,
			expectedMap:   1,
			expectErr:     false,
		},
		{
			name:          "Sync FTDNA",
			provider:      "ftdna",
			expectedFetch: 1,
			expectedMap:   1,
			expectErr:     false,
		},
		{
			name:          "Sync FamilySearch",
			provider:      "familysearch",
			expectedFetch: 1,
			expectedMap:   1,
			expectErr:     false,
		},
		{
			name:          "Sync Ancestry",
			provider:      "ancestry",
			expectedFetch: 0,
			expectedMap:   0,
			expectErr:     false,
		},
		{
			name:          "Sync Unknown Provider",
			provider:      "unknown",
			expectedFetch: 0,
			expectedMap:   0,
			expectErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := svc.SyncExternalData(ctx, tt.provider, map[string]string{})
			if tt.expectErr {
				if err == nil {
					t.Errorf("expected error for provider %s, got none", tt.provider)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error for provider %s: %v", tt.provider, err)
			}

			if res.RecordsFetched != tt.expectedFetch {
				t.Errorf("expected %d records fetched, got %d", tt.expectedFetch, res.RecordsFetched)
			}

			if res.RecordsMapped != tt.expectedMap {
				t.Errorf("expected %d records mapped, got %d", tt.expectedMap, res.RecordsMapped)
			}

			if res.Provider != tt.provider {
				t.Errorf("expected provider in result to be %s, got %s", tt.provider, res.Provider)
			}
		})
	}
}
