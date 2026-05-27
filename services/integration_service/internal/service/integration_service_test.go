package service

import (
	"context"
	"strings"
	"testing"
)

func TestDNAProviders(t *testing.T) {
	svc := NewIntegrationService().(*integrationService)
	ctx := context.Background()

	providersToTest := []string{"23andMe", "AncestryDNA", "FTDNA"}

	for _, pName := range providersToTest {
		t.Run(pName, func(t *testing.T) {
			provider, ok := svc.providers[strings.ToLower(pName)]
			if !ok {
				t.Fatalf("Provider %s not found", pName)
			}

			data, err := provider.FetchData(ctx, nil)
			if err != nil {
				t.Fatalf("FetchData error: %v", err)
			}

			if data == nil || len(data.Records) == 0 {
				t.Fatalf("Expected non-empty records from FetchData for %s", pName)
			}

			internalRecords, err := provider.MapToInternal(data)
			if err != nil {
				t.Fatalf("MapToInternal error: %v", err)
			}

			if len(internalRecords) != len(data.Records) {
				t.Fatalf("Expected %d internal records, got %d", len(data.Records), len(internalRecords))
			}

			for i, ir := range internalRecords {
				if ir.Type == "" {
					t.Errorf("Record %d missing type", i)
				}
				if ir.Extra == nil {
					t.Errorf("Record %d missing Extra map", i)
				}
			}
		})
	}
}

func TestListProvidersStatuses(t *testing.T) {
	svc := NewIntegrationService()
	ctx := context.Background()

	providers := svc.ListProviders(ctx)
	dnaProvidersChecked := 0

	for _, p := range providers {
		if p.Category == "DNA" {
			if p.Status != "AVAILABLE" {
				t.Errorf("Expected DNA provider %s to be AVAILABLE, got %s", p.Name, p.Status)
			}
			dnaProvidersChecked++
		}
	}

	if dnaProvidersChecked != 3 {
		t.Errorf("Expected to check 3 DNA providers, checked %d", dnaProvidersChecked)
	}
}

func TestSyncExternalData_DNA(t *testing.T) {
    svc := NewIntegrationService()
	ctx := context.Background()

    // Test 23andMe
    res, err := svc.SyncExternalData(ctx, "23andMe", nil)
    if err != nil {
        t.Fatalf("SyncExternalData 23andMe failed: %v", err)
    }
    if res.RecordsFetched == 0 || res.RecordsMapped == 0 {
        t.Errorf("SyncExternalData 23andMe records empty")
    }

    // Test AncestryDNA
    res, err = svc.SyncExternalData(ctx, "AncestryDNA", nil)
    if err != nil {
        t.Fatalf("SyncExternalData AncestryDNA failed: %v", err)
    }
    if res.RecordsFetched == 0 || res.RecordsMapped == 0 {
        t.Errorf("SyncExternalData AncestryDNA records empty")
    }

    // Test FTDNA
    res, err = svc.SyncExternalData(ctx, "FTDNA", nil)
    if err != nil {
        t.Fatalf("SyncExternalData FTDNA failed: %v", err)
    }
    if res.RecordsFetched == 0 || res.RecordsMapped == 0 {
        t.Errorf("SyncExternalData FTDNA records empty")
    }
}
