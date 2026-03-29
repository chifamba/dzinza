package service

import (
	"math"
	"testing"
)

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		a, b     string
		expected int
	}{
		{"", "", 0},
		{"abc", "", 3},
		{"", "abc", 3},
		{"abc", "abc", 0},
		{"kitten", "sitting", 3},
		{"John", "Jon", 1},
		{"Tendai", "Tendayi", 1},
		{"Chifamba", "Chifambe", 1},
	}

	for _, tc := range tests {
		t.Run(tc.a+"_"+tc.b, func(t *testing.T) {
			d := LevenshteinDistance(tc.a, tc.b)
			if d != tc.expected {
				t.Errorf("LevenshteinDistance(%q, %q) = %d, want %d", tc.a, tc.b, d, tc.expected)
			}
		})
	}
}

func TestNormalizedSimilarity(t *testing.T) {
	tests := []struct {
		a, b    string
		minSim  float64
	}{
		{"John", "John", 1.0},
		{"John", "Jon", 0.7},
		{"Tendai", "Tendayi", 0.8},
		{"abc", "xyz", 0.0},
		{"", "", 1.0},
	}

	for _, tc := range tests {
		t.Run(tc.a+"_"+tc.b, func(t *testing.T) {
			sim := NormalizedSimilarity(tc.a, tc.b)
			if sim < tc.minSim {
				t.Errorf("NormalizedSimilarity(%q, %q) = %.2f, want >= %.2f", tc.a, tc.b, sim, tc.minSim)
			}
		})
	}
}

func TestDateProximityScore(t *testing.T) {
	tests := []struct {
		d1, d2   string
		expected float64
		delta    float64
	}{
		{"1920", "1920", 1.0, 0.01},
		{"1920", "1925", 0.5, 0.01},
		{"1920", "1930", 0.0, 0.01},
		{"about 1920", "1921", 0.9, 0.01},
		{"circa 1900", "1905", 0.5, 0.01},
		{"", "1920", 0.0, 0.01},
		{"1920", "", 0.0, 0.01},
	}

	for _, tc := range tests {
		t.Run(tc.d1+"_"+tc.d2, func(t *testing.T) {
			score := DateProximityScore(tc.d1, tc.d2)
			if math.Abs(score-tc.expected) > tc.delta {
				t.Errorf("DateProximityScore(%q, %q) = %.2f, want %.2f (±%.2f)", tc.d1, tc.d2, score, tc.expected, tc.delta)
			}
		})
	}
}

func TestNameSimilarityScore(t *testing.T) {
	tests := []struct {
		given1, sur1, given2, sur2 string
		minSim float64
	}{
		{"John", "Smith", "John", "Smith", 1.0},
		{"John", "Chifamba", "Jon", "Chifambe", 0.7},
		{"Alice", "Jones", "Bob", "Johnson", 0.0},
	}

	for _, tc := range tests {
		t.Run(tc.given1+"_"+tc.sur1, func(t *testing.T) {
			sim := NameSimilarityScore(tc.given1, tc.sur1, tc.given2, tc.sur2)
			if sim < tc.minSim {
				t.Errorf("NameSimilarityScore = %.2f, want >= %.2f", sim, tc.minSim)
			}
		})
	}
}

func TestComputeConfidenceScore(t *testing.T) {
	tests := []struct {
		name   string
		nameSim, dateSim, placeSim, topologySim float64
		expected float64
	}{
		{"perfect match", 1.0, 1.0, 1.0, 1.0, 100.0},
		{"no match", 0.0, 0.0, 0.0, 0.0, 0.0},
		{"name only", 1.0, 0.0, 0.0, 0.0, 40.0},
		{"name + date", 1.0, 1.0, 0.0, 0.0, 60.0},
		{"topology only", 0.0, 0.0, 0.0, 1.0, 25.0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			score := ComputeConfidenceScore(tc.nameSim, tc.dateSim, tc.placeSim, tc.topologySim)
			if math.Abs(score-tc.expected) > 0.01 {
				t.Errorf("ComputeConfidenceScore = %.2f, want %.2f", score, tc.expected)
			}
		})
	}
}

func TestExtractYear(t *testing.T) {
	tests := []struct {
		input    string
		expected int
	}{
		{"1920", 1920},
		{"about 1920", 1920},
		{"circa 1850", 1850},
		{"1920-05-15", 1920},
		{"bef 1900", 1900},
		{"invalid", 0},
		{"", 0},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			year := extractYear(tc.input)
			if year != tc.expected {
				t.Errorf("extractYear(%q) = %d, want %d", tc.input, year, tc.expected)
			}
		})
	}
}

func TestPlaceSimilarityScore(t *testing.T) {
	tests := []struct {
		p1, p2  string
		minSim  float64
	}{
		{"Harare", "Harare", 1.0},
		{"Harare, Zimbabwe", "Harare Zimbabwe", 0.9},
		{"", "Harare", -0.1}, // Will return 0.0 for empty input
	}

	for _, tc := range tests {
		t.Run(tc.p1+"_"+tc.p2, func(t *testing.T) {
			sim := PlaceSimilarityScore(tc.p1, tc.p2)
			if sim < tc.minSim {
				t.Errorf("PlaceSimilarityScore(%q, %q) = %.2f, want >= %.2f", tc.p1, tc.p2, sim, tc.minSim)
			}
		})
	}
}
