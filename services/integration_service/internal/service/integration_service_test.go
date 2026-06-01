package service

import (
	"context"
	"testing"
)

func TestIntegrationService_ListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) == 0 {
		t.Fatalf("expected providers, got 0")
	}

	dnaProviders := map[string]bool{
		"23andMe":     true,
		"AncestryDNA": true,
		"FTDNA":       true,
	}

	for _, p := range providers {
		if dnaProviders[p.Name] {
			if p.Status != "AVAILABLE" {
				t.Errorf("expected DNA provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
		}
	}
}

func TestIntegrationService_SyncExternalData_AncestryDNA(t *testing.T) {
	svc := NewIntegrationService()
	providerName := "ancestrydna"

	result, err := svc.SyncExternalData(context.Background(), providerName, nil)
	if err != nil {
		t.Fatalf("expected no error for AncestryDNA sync, got %v", err)
	}

	if result.Provider != providerName {
		t.Errorf("expected provider %s, got %s", providerName, result.Provider)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched for AncestryDNA, got %d", result.RecordsFetched)
	}

	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped for AncestryDNA, got %d", result.RecordsMapped)
	}
}

func TestIntegrationService_SyncExternalData_FTDNA(t *testing.T) {
	svc := NewIntegrationService()
	providerName := "ftdna"

	result, err := svc.SyncExternalData(context.Background(), providerName, nil)
	if err != nil {
		t.Fatalf("expected no error for FTDNA sync, got %v", err)
	}

	if result.Provider != providerName {
		t.Errorf("expected provider %s, got %s", providerName, result.Provider)
	}

	if result.RecordsFetched != 1 {
		t.Errorf("expected 1 record fetched for FTDNA, got %d", result.RecordsFetched)
	}

	if result.RecordsMapped != 1 {
		t.Errorf("expected 1 record mapped for FTDNA, got %d", result.RecordsMapped)
	}
}
