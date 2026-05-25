package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	foundDNA := 0
	for _, p := range providers {
		if p.Category == "DNA" {
			if p.Status != "AVAILABLE" {
				t.Errorf("Expected DNA provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
			foundDNA++
		}
	}

	if foundDNA != 3 {
		t.Errorf("Expected 3 DNA providers, got %d", foundDNA)
	}
}

func TestIntegrationService_SyncExternalData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	providersToTest := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, pName := range providersToTest {
		t.Run(pName, func(t *testing.T) {
			result, err := svc.SyncExternalData(ctx, pName, nil)
			if err != nil {
				t.Fatalf("SyncExternalData failed for %s: %v", pName, err)
			}

			if result.Provider != pName {
				t.Errorf("Expected provider %s, got %s", pName, result.Provider)
			}

			if result.RecordsFetched != 1 {
				t.Errorf("Expected 1 record fetched for %s, got %d", pName, result.RecordsFetched)
			}

			if result.RecordsMapped != 1 {
				t.Errorf("Expected 1 record mapped for %s, got %d", pName, result.RecordsMapped)
			}
		})
	}
}
