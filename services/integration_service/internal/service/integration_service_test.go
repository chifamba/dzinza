package service

import (
	"context"
	"strings"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Fatalf("expected 5 providers, got %d", len(providers))
	}

	providerStatusMap := make(map[string]string)
	for _, p := range providers {
		providerStatusMap[p.Name] = p.Status
	}

	availableProviders := []string{"23andMe", "AncestryDNA", "FTDNA"}
	for _, name := range availableProviders {
		if status := providerStatusMap[name]; status != "AVAILABLE" {
			t.Errorf("expected provider %s to be AVAILABLE, got %s", name, status)
		}
	}

	stubProviders := []string{"FamilySearch", "Ancestry"}
	for _, name := range stubProviders {
		if status := providerStatusMap[name]; status != "STUB" {
			t.Errorf("expected provider %s to be STUB, got %s", name, status)
		}
	}
}

func TestSyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()

	testCases := []struct {
		providerName string
		expectedName string
		expectedCM   float64
	}{
		{"23andme", "DNA Match", 150.0},
		{"ancestrydna", "Ancestry DNA Match", 200.0},
		{"ftdna", "FTDNA Match", 100.0},
	}

	for _, tc := range testCases {
		t.Run(tc.providerName, func(t *testing.T) {
			result, err := svc.SyncExternalData(context.Background(), tc.providerName, nil)
			if err != nil {
				t.Fatalf("expected no error for %s, got %v", tc.providerName, err)
			}

			if result.RecordsFetched != 1 {
				t.Errorf("expected 1 record fetched for %s, got %d", tc.providerName, result.RecordsFetched)
			}
			if result.RecordsMapped != 1 {
				t.Errorf("expected 1 record mapped for %s, got %d", tc.providerName, result.RecordsMapped)
			}
			if strings.ToLower(result.Provider) != tc.providerName {
				t.Errorf("expected provider %s, got %s", tc.providerName, result.Provider)
			}

			// Validate internal mapping logic
			provider, ok := svc.(*integrationService).providers[tc.providerName]
			if !ok {
				t.Fatalf("expected provider %s to exist", tc.providerName)
			}

			data, _ := provider.FetchData(context.Background(), nil)
			records, _ := provider.MapToInternal(data)

			if len(records) != 1 {
				t.Fatalf("expected 1 internal record, got %d", len(records))
			}

			record := records[0]
			if record.Type != "PERSON" {
				t.Errorf("expected Type PERSON, got %s", record.Type)
			}

			extra := record.Extra
			if extra == nil {
				t.Fatalf("expected Extra map, got nil")
			}

			if name, ok := extra["dna_match_name"].(string); !ok || name != tc.expectedName {
				t.Errorf("expected dna_match_name %s, got %v", tc.expectedName, extra["dna_match_name"])
			}

			// Handle both int and float64 assertions since JSON unmarshalling or our mock can do both
			var cm float64
			switch v := extra["shared_cm"].(type) {
			case int:
				cm = float64(v)
			case float64:
				cm = v
			default:
				t.Fatalf("unexpected type for shared_cm: %T", v)
			}

			if cm != tc.expectedCM {
				t.Errorf("expected shared_cm %f, got %f", tc.expectedCM, cm)
			}
		})
	}
}
