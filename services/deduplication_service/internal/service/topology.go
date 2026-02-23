package service

// ComputeTopologySimilarity calculates the Jaccard similarity between two sets of relative IDs.
// Returns a value between 0.0 and 1.0.
func ComputeTopologySimilarity(relatives1, relatives2 []string) float64 {
	if len(relatives1) == 0 && len(relatives2) == 0 {
		return 0.0
	}

	set1 := make(map[string]bool)
	for _, id := range relatives1 {
		set1[id] = true
	}

	set2 := make(map[string]bool)
	for _, id := range relatives2 {
		set2[id] = true
	}

	intersection := 0
	for id := range set1 {
		if set2[id] {
			intersection++
		}
	}

	union := len(set1) + len(set2) - intersection
	if union == 0 {
		return 0.0
	}

	return float64(intersection) / float64(union)
}
