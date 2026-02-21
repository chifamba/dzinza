package service

import (
	"context"
	"fmt"
	"math/rand"
	"time"

	"github.com/chifamba/dzinza/services/genealogy_service/internal/models"
)

// AncestryStub is a stub for Ancestry DNA.
type AncestryStub struct{}

func (p *AncestryStub) FetchResults(ctx context.Context, kitID string) (*models.DNATest, error) {
	// Simulate API call
	time.Sleep(100 * time.Millisecond)

	// Stub data
	return &models.DNATest{
		Provider:     "Ancestry",
		TestType:     "Autosomal",
		KitID:        kitID,
		ResultURL:    fmt.Sprintf("https://ancestry.com/dna/results/%s", kitID),
		HaplogroupP:  "", // Ancestry mainly autosomal
		HaplogroupM:  "",
		RawDataS3Key: fmt.Sprintf("dna/ancestry/%s/raw_data.zip", kitID),
		CreatedAt:    time.Now(),
	}, nil
}

// TwentyThreeAndMeStub is a stub for 23andMe.
type TwentyThreeAndMeStub struct{}

func (p *TwentyThreeAndMeStub) FetchResults(ctx context.Context, kitID string) (*models.DNATest, error) {
	time.Sleep(100 * time.Millisecond)

	return &models.DNATest{
		Provider:     "23andMe",
		TestType:     "Autosomal + Y-DNA + mtDNA",
		KitID:        kitID,
		ResultURL:    fmt.Sprintf("https://you.23andme.com/reports/ancestry_composition/%s", kitID),
		HaplogroupP:  randomHaplogroup("R1b", "E1b1a", "J2", "I1"),
		HaplogroupM:  randomHaplogroup("H", "L3", "U5", "T2"),
		RawDataS3Key: fmt.Sprintf("dna/23andme/%s/genome.txt", kitID),
		CreatedAt:    time.Now(),
	}, nil
}

// MyHeritageStub is a stub for MyHeritage.
type MyHeritageStub struct{}

func (p *MyHeritageStub) FetchResults(ctx context.Context, kitID string) (*models.DNATest, error) {
	time.Sleep(100 * time.Millisecond)

	return &models.DNATest{
		Provider:     "MyHeritage",
		TestType:     "Autosomal",
		KitID:        kitID,
		ResultURL:    fmt.Sprintf("https://www.myheritage.com/dna/matches/%s", kitID),
		HaplogroupP:  "",
		HaplogroupM:  "",
		RawDataS3Key: fmt.Sprintf("dna/myheritage/%s/raw_data.csv", kitID),
		CreatedAt:    time.Now(),
	}, nil
}

func randomHaplogroup(options ...string) string {
	if len(options) == 0 {
		return "Unknown"
	}
	return options[rand.Intn(len(options))]
}
