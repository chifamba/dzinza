package service

import (
	"context"
	"testing"
)

func TestListProviders(t *testing.T) {
	svc := NewIntegrationService()
	providers := svc.ListProviders(context.Background())

	expectedStatuses := map[string]string{
		"23andMe":     "AVAILABLE",
		"AncestryDNA": "AVAILABLE",
		"FTDNA":       "AVAILABLE",
		"FamilySearch": "STUB",
		"Ancestry":     "STUB",
	}

	for _, p := range providers {
		expectedStatus, ok := expectedStatuses[p.Name]
		if ok && p.Status != expectedStatus {
			t.Errorf("Provider %s: expected status %s, got %s", p.Name, expectedStatus, p.Status)
		}
	}
}

func TestDNAProvidersSyncData(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	providerNames := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, name := range providerNames {
		result, err := svc.SyncExternalData(ctx, name, nil)
		if err != nil {
			t.Errorf("Provider %s SyncExternalData error: %v", name, err)
			continue
		}
		if result.RecordsFetched == 0 {
			t.Errorf("Provider %s fetched 0 records", name)
		}
		if result.RecordsMapped == 0 {
			t.Errorf("Provider %s mapped 0 records", name)
		}
	}
}

func TestFamilySearchMapToInternal(t *testing.T) {
	provider := &familySearchProvider{}
	data := &ProviderData{
		Records: []map[string]interface{}{
			{"type": "person", "given_name": "John", "surname": "Doe", "birth_date": "1900"},
			{"type": "person", "given_name": "Jane"}, // missing surname and birth_date
		},
	}
	records, err := provider.MapToInternal(data)
	if err != nil {
		t.Fatalf("MapToInternal error: %v", err)
	}
	if len(records) != 2 {
		t.Fatalf("Expected 2 records, got %d", len(records))
	}
	if records[0].GivenName != "John" || records[0].Surname != "Doe" || records[0].BirthDate != "1900" {
		t.Errorf("Record 0 incorrectly mapped: %+v", records[0])
	}
	if records[1].GivenName != "Jane" || records[1].Surname != "<nil>" || records[1].BirthDate != "<nil>" {
		t.Errorf("Record 1 incorrectly mapped: %+v", records[1])
	}
}
