package service

import (
	"context"
	"testing"
)

func TestIntegrationService_DNAProviders(t *testing.T) {
	svc := NewIntegrationService()

	// 1. Verify that ListProviders marks the DNA providers as AVAILABLE
	providers := svc.ListProviders(context.Background())
	providerStatuses := make(map[string]string)
	for _, p := range providers {
		providerStatuses[p.Name] = p.Status
	}

	dnaProviders := []string{"23andMe", "AncestryDNA", "FTDNA"}
	for _, name := range dnaProviders {
		if status := providerStatuses[name]; status != "AVAILABLE" {
			t.Errorf("Expected status for %s to be AVAILABLE, got %s", name, status)
		}
	}

	// 2. Test SyncExternalData for each DNA provider to verify RecordsFetched > 0
	for _, name := range dnaProviders {
		res, err := svc.SyncExternalData(context.Background(), name, map[string]string{})
		if err != nil {
			t.Fatalf("SyncExternalData failed for %s: %v", name, err)
		}

		if res.RecordsFetched == 0 {
			t.Errorf("Expected RecordsFetched > 0 for %s", name)
		}

		if res.RecordsMapped == 0 {
			t.Errorf("Expected RecordsMapped > 0 for %s", name)
		}

		if res.RecordsFetched != res.RecordsMapped {
			t.Errorf("Expected RecordsFetched (%d) to equal RecordsMapped (%d) for %s", res.RecordsFetched, res.RecordsMapped, name)
		}
	}
}
