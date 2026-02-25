package service

import (
	"math"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

// LevenshteinDistance computes the minimum edit distance between two strings.
func LevenshteinDistance(a, b string) int {
	a = strings.ToLower(strings.TrimSpace(a))
	b = strings.ToLower(strings.TrimSpace(b))

	if a == b {
		return 0
	}
	if len(a) == 0 {
		return len(b)
	}
	if len(b) == 0 {
		return len(a)
	}

	// Create distance matrix
	d := make([][]int, len(a)+1)
	for i := range d {
		d[i] = make([]int, len(b)+1)
		d[i][0] = i
	}
	for j := 0; j <= len(b); j++ {
		d[0][j] = j
	}

	for i := 1; i <= len(a); i++ {
		for j := 1; j <= len(b); j++ {
			cost := 1
			if a[i-1] == b[j-1] {
				cost = 0
			}
			d[i][j] = min(
				d[i-1][j]+1,      // deletion
				d[i][j-1]+1,      // insertion
				d[i-1][j-1]+cost, // substitution
			)
		}
	}

	return d[len(a)][len(b)]
}

// NormalizedSimilarity computes a 0.0–1.0 similarity score based on Levenshtein distance.
// 1.0 means identical, 0.0 means completely different.
func NormalizedSimilarity(a, b string) float64 {
	if a == "" && b == "" {
		return 1.0
	}

	distance := LevenshteinDistance(a, b)
	maxLen := max(len(a), len(b))
	if maxLen == 0 {
		return 1.0
	}

	return 1.0 - float64(distance)/float64(maxLen)
}

// DateProximityScore computes a similarity score for two date strings.
// Handles flexible formats: "about 1920", "1920", "1920-05", "1920-05-15".
// Returns 0.0–1.0 where 1.0 means same date and 0.0 means very far apart.
func DateProximityScore(d1, d2 string) float64 {
	if d1 == "" || d2 == "" {
		return 0.0
	}

	y1 := extractYear(d1)
	y2 := extractYear(d2)

	if y1 == 0 || y2 == 0 {
		return 0.0
	}

	diff := math.Abs(float64(y1 - y2))

	// Same year = 1.0, each year of difference reduces score
	// Beyond 10 years difference = 0.0
	if diff >= 10 {
		return 0.0
	}

	return 1.0 - (diff / 10.0)
}

// extractYear extracts a year from various flexible date formats.
func extractYear(dateStr string) int {
	dateStr = strings.TrimSpace(dateStr)

	// Remove common prefixes
	prefixes := []string{"about ", "circa ", "abt ", "bef ", "aft ", "before ", "after ", "est "}
	lower := strings.ToLower(dateStr)
	for _, p := range prefixes {
		if strings.HasPrefix(lower, p) {
			dateStr = dateStr[len(p):]
			break
		}
	}

	// Try to find a 4-digit year
	re := regexp.MustCompile(`\b(\d{4})\b`)
	matches := re.FindStringSubmatch(dateStr)
	if len(matches) >= 2 {
		if year, err := strconv.Atoi(matches[1]); err == nil {
			return year
		}
	}

	return 0
}

// NameSimilarityScore computes a combined similarity score for person names.
// Compares given name and surname separately and returns a weighted average.
func NameSimilarityScore(givenName1, surname1, givenName2, surname2 string) float64 {
	givenSim := NormalizedSimilarity(givenName1, givenName2)
	surnameSim := NormalizedSimilarity(surname1, surname2)

	// Surname is weighted more heavily (60%) since it's more discriminating
	return givenSim*0.4 + surnameSim*0.6
}

// PlaceSimilarityScore computes similarity between two place strings.
// Normalizes case and whitespace before comparison.
func PlaceSimilarityScore(place1, place2 string) float64 {
	if place1 == "" || place2 == "" {
		return 0.0
	}

	// Normalize: trim, lowercase, collapse whitespace
	normalize := func(s string) string {
		s = strings.TrimSpace(s)
		s = strings.ToLower(s)
		// Remove punctuation
		s = strings.Map(func(r rune) rune {
			if unicode.IsPunct(r) {
				return ' '
			}
			return r
		}, s)
		// Collapse whitespace
		fields := strings.Fields(s)
		return strings.Join(fields, " ")
	}

	return NormalizedSimilarity(normalize(place1), normalize(place2))
}

// TopologySimilarityScore computes the Jaccard index between two sets of relative IDs.
func TopologySimilarityScore(relatives1, relatives2 []string) float64 {
	if len(relatives1) == 0 && len(relatives2) == 0 {
		return 0.0
	}

	set1 := make(map[string]struct{})
	for _, id := range relatives1 {
		set1[id] = struct{}{}
	}

	intersection := 0
	union := len(relatives1)

	for _, id := range relatives2 {
		if _, exists := set1[id]; exists {
			intersection++
		} else {
			union++
		}
	}

	if union == 0 {
		return 0.0
	}

	return float64(intersection) / float64(union)
}

// ComputeConfidenceScore computes an overall duplicate confidence score (0–100).
//
// Weights:
//   - Name similarity: 40%
//   - Date proximity: 20%
//   - Place similarity: 15%
//   - Topology similarity: 25%
func ComputeConfidenceScore(nameSimilarity, dateSimilarity, placeSimilarity, topologySimilarity float64) float64 {
	score := nameSimilarity*40.0 + dateSimilarity*20.0 + placeSimilarity*15.0 + topologySimilarity*25.0

	// Round to 2 decimal places
	return math.Round(score*100) / 100
}

func min(a, b, c int) int {
	if a < b && a < c {
		return a
	}
	if b < c {
		return b
	}
	return c
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
