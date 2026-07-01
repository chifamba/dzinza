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
		"23andme":     "AVAILABLE",
		"ancestrydna": "AVAILABLE",
		"ftdna":       "AVAILABLE",
	}

	for _, p := range providers {
		key := strings.ToLower(p.Name)
		if expectedStatus, ok := expectedStatuses[key]; ok {
			if p.Status != expectedStatus {
				t.Errorf("Provider %s: expected status %s, got %s", p.Name, expectedStatus, p.Status)
			}
		}
	}
}

func TestSyncExternalData(t *testing.T) {
	svc := NewIntegrationService()

	providersToTest := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, providerName := range providersToTest {
		t.Run(providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), providerName, nil)
			if err != nil {
				t.Fatalf("SyncExternalData failed for %s: %v", providerName, err)
			}

			if result.RecordsFetched != 1 {
				t.Errorf("Expected 1 record fetched for %s, got %d", providerName, result.RecordsFetched)
			}

			if result.RecordsMapped != 1 {
				t.Errorf("Expected 1 record mapped for %s, got %d", providerName, result.RecordsMapped)
			}
		})
	}
}

func TestMapToInternal(t *testing.T) {
	// Directly test the providers' MapToInternal to verify Extra map properties
	svc := NewIntegrationService()
	isvc := svc.(*integrationService)

	providersToTest := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, providerName := range providersToTest {
		t.Run(providerName+"_MapToInternal", func(t *testing.T) {
			p, ok := isvc.providers[strings.ToLower(providerName)]
			if !ok {
				t.Fatalf("Provider %s not found", providerName)
			}

			data, err := p.FetchData(context.Background(), nil)
			if err != nil {
				t.Fatalf("FetchData failed for %s: %v", providerName, err)
			}

			records, err := p.MapToInternal(data)
			if err != nil {
				t.Fatalf("MapToInternal failed for %s: %v", providerName, err)
			}

			if len(records) != 1 {
				t.Fatalf("Expected 1 record mapped for %s, got %d", providerName, len(records))
			}

			rec := records[0]
			if rec.Type != "PERSON" {
				t.Errorf("Expected record type PERSON for %s, got %s", providerName, rec.Type)
			}

			if rec.Extra == nil {
				t.Fatalf("Expected non-nil Extra map for %s", providerName)
			}

			expectedKeys := []string{"dna_match_name", "shared_cm", "confidence"}
			for _, key := range expectedKeys {
				if _, ok := rec.Extra[key]; !ok {
					t.Errorf("Expected Extra map to contain key %s for %s", key, providerName)
				}
			}
		})
	}
}
