package service

import (
	"context"
	"strings"
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

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		if !ok {
			t.Errorf("unexpected provider %s", p.Name)
			continue
		}

		if p.Status != expectedStatus {
			t.Errorf("provider %s: expected status %s, got %s", p.Name, expectedStatus, p.Status)
		}
	}
}

func TestSyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()
	config := map[string]string{}

	providersToTest := []struct {
		name        string
		expectedNum int
	}{
		{"23andMe", 1},
		{"AncestryDNA", 1},
		{"FTDNA", 1},
		{"FamilySearch", 1},
	}

	for _, pt := range providersToTest {
		t.Run(pt.name, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, pt.name, config)
			if err != nil {
				t.Fatalf("unexpected error for %s: %v", pt.name, err)
			}

			if result.Provider != pt.name {
				t.Errorf("expected provider %s, got %s", pt.name, result.Provider)
			}

			if result.RecordsFetched != pt.expectedNum {
				t.Errorf("provider %s: expected %d records fetched, got %d", pt.name, pt.expectedNum, result.RecordsFetched)
			}

			if result.RecordsMapped != pt.expectedNum {
				t.Errorf("provider %s: expected %d records mapped, got %d", pt.name, pt.expectedNum, result.RecordsMapped)
			}
		})
	}
}

func TestIntegrationServiceProvidersMapKeysAreLowercase(t *testing.T) {
    svc := NewIntegrationService().(*integrationService)

    for key, _ := range svc.providers {
        if key != strings.ToLower(key) {
            t.Errorf("expected provider key %s to be lowercase", key)
        }
    }
}
