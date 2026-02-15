package service

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/chifamba/dzinza/services/deduplication_service/internal/models"
	"github.com/chifamba/dzinza/services/deduplication_service/internal/repository"
)

// DefaultConfidenceThreshold is the minimum confidence score to report a pair as potential duplicates.
const DefaultConfidenceThreshold = 60.0

// DeduplicationService defines the interface for deduplication operations.
type DeduplicationService interface {
	DetectDuplicates(ctx context.Context) ([]models.DuplicatePair, error)
	Merge(ctx context.Context, survivingID, mergedID string) error
}

type deduplicationService struct {
	repo                repository.DeduplicationRepository
	confidenceThreshold float64
}

// NewDeduplicationService creates a deduplication service with configurable threshold.
func NewDeduplicationService(repo repository.DeduplicationRepository) DeduplicationService {
	return &deduplicationService{
		repo:                repo,
		confidenceThreshold: DefaultConfidenceThreshold,
	}
}

// DetectDuplicates fetches all candidates, computes pairwise similarity, and filters by threshold.
func (s *deduplicationService) DetectDuplicates(ctx context.Context) ([]models.DuplicatePair, error) {
	candidates, err := s.repo.FindCandidatePairs(ctx)
	if err != nil {
		return nil, err
	}

	slog.Info("dedup: loaded candidates for comparison", slog.Int("count", len(candidates)))

	var pairs []models.DuplicatePair

	// Pairwise comparison — group by first letter of surname to reduce comparisons
	groups := groupBySurnamePrefix(candidates)

	for _, group := range groups {
		for i := 0; i < len(group); i++ {
			for j := i + 1; j < len(group); j++ {
				p1, p2 := group[i], group[j]

				// Skip if same gender check fails (different genders = not duplicates)
				if p1.Gender != "" && p2.Gender != "" && p1.Gender != p2.Gender {
					continue
				}

				nameSim := NameSimilarityScore(p1.GivenName, p1.Surname, p2.GivenName, p2.Surname)
				dateSim := DateProximityScore(p1.BirthDate, p2.BirthDate)
				placeSim := PlaceSimilarityScore(p1.BirthPlace, p2.BirthPlace)
				confidence := ComputeConfidenceScore(nameSim, dateSim, placeSim)

				if confidence >= s.confidenceThreshold {
					pairs = append(pairs, models.DuplicatePair{
						Person1ID:       p1.ID,
						Person2ID:       p2.ID,
						ConfidenceScore: confidence,
						NameSimilarity:  nameSim,
						DateSimilarity:  dateSim,
						PlaceSimilarity: placeSim,
						Status:          "PENDING",
						DetectedAt:      time.Now(),
					})
				}
			}
		}
	}

	slog.Info("dedup: detection complete",
		slog.Int("candidates", len(candidates)),
		slog.Int("pairs_found", len(pairs)))

	return pairs, nil
}

// Merge delegates to the repository to merge two person nodes.
func (s *deduplicationService) Merge(ctx context.Context, survivingID, mergedID string) error {
	return s.repo.MergePersons(ctx, survivingID, mergedID)
}

// groupBySurnamePrefix groups candidates by the first 2 characters of their surname
// to reduce the number of pairwise comparisons.
func groupBySurnamePrefix(candidates []models.PersonCandidate) map[string][]models.PersonCandidate {
	groups := make(map[string][]models.PersonCandidate)
	for _, c := range candidates {
		if c.Surname == "" {
			continue
		}
		prefix := strings.ToLower(c.Surname)
		if len(prefix) > 2 {
			prefix = prefix[:2]
		}
		groups[prefix] = append(groups[prefix], c)
	}
	return groups
}
