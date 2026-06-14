package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	if len(providers) != 5 {
		t.Errorf("Expected 5 providers, got %d", len(providers))
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
			t.Errorf("Unexpected provider %s", p.Name)
			continue
		}
		if p.Status != expectedStatus {
			t.Errorf("Provider %s: expected status %s, got %s", p.Name, expectedStatus, p.Status)
		}
	}
}

func TestSyncExternalData_FamilySearch_NilHandling(t *testing.T) {
	p := &familySearchProvider{}

	// Create mock data with missing keys
	data := &ProviderData{
		Records: []map[string]interface{}{
			{
				"type":       "person",
				"given_name": "Sample",
				// "surname": missing
				// "birth_date": missing
			},
		},
	}

	records, err := p.MapToInternal(data)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(records) != 1 {
		t.Fatalf("expected 1 record, got %d", len(records))
	}

	record := records[0]
	if record.GivenName != "Sample" {
		t.Errorf("expected given_name 'Sample', got '%s'", record.GivenName)
	}
	if record.Surname != "" {
		t.Errorf("expected empty surname for missing key, got '%s'", record.Surname)
	}
	if record.BirthDate != "" {
		t.Errorf("expected empty birth_date for missing key, got '%s'", record.BirthDate)
	}
}

func TestSyncExternalData_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	providers := []string{"23andme", "ancestrydna", "ftdna"}

	for _, p := range providers {
		res, err := svc.SyncExternalData(ctx, p, nil)
		if err != nil {
			t.Fatalf("SyncExternalData failed for %s: %v", p, err)
		}
		if res.Provider != p {
			t.Errorf("Expected provider %s, got %s", p, res.Provider)
		}
		if res.RecordsFetched != 1 {
			t.Errorf("Expected 1 record fetched for %s, got %d", p, res.RecordsFetched)
		}
		if res.RecordsMapped != 1 {
			t.Errorf("Expected 1 record mapped for %s, got %d", p, res.RecordsMapped)
		}
	}
}
