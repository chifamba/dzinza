package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	expectedStatuses := map[string]string{
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
		"23andMe":      "AVAILABLE",
		"AncestryDNA":  "AVAILABLE",
		"FTDNA":        "AVAILABLE",
	}

	if len(providers) != 5 {
		t.Fatalf("expected 5 providers, got %d", len(providers))
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

	tests := []struct {
		providerName string
		expectCount  int
		expectError  bool
	}{
		{"23andMe", 1, false},
		{"AncestryDNA", 1, false},
		{"FTDNA", 1, false},
		{"FamilySearch", 1, false},
		{"Ancestry", 0, false},
		{"Unknown", 0, true},
	}

	for _, tc := range tests {
		t.Run(tc.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, tc.providerName, nil)
			if tc.expectError {
				if err == nil {
					t.Fatalf("expected error for provider %s, got nil", tc.providerName)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error for provider %s: %v", tc.providerName, err)
			}
			if result.RecordsMapped != tc.expectCount {
				t.Errorf("expected %d records mapped for provider %s, got %d", tc.expectCount, tc.providerName, result.RecordsMapped)
			}
			if result.Provider != tc.providerName {
				t.Errorf("expected result provider %s, got %s", tc.providerName, result.Provider)
			}
		})
	}
}
