package service

import (
	"context"
	"log/slog"
	"math"
	"strings"
	"time"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

// AIService defines the interface for AI content moderation.
type AIService interface {
	ModerateContent(ctx context.Context, req *models.ModerationRequest) (*models.ModerationResponse, error)
}

type aiService struct{}

// NewAIService creates a new AI moderation service.
func NewAIService() AIService {
	return &aiService{}
}

// Moderation categories and their keyword dictionaries with per-word severity weights.
var moderationDict = map[string]map[string]float64{
	"profanity": {
		"damn": 0.3, "hell": 0.2, "bastard": 0.5,
		"crap": 0.2, "ass": 0.3,
	},
	"hate_speech": {
		"hate": 0.6, "racist": 0.8, "bigot": 0.7,
		"slur": 0.8, "supremacy": 0.9, "genocide": 0.9,
	},
	"harassment": {
		"threat": 0.7, "kill": 0.8, "attack": 0.5,
		"stalk": 0.7, "bully": 0.6, "harass": 0.7,
	},
	"spam": {
		"buy now": 0.6, "click here": 0.5, "free money": 0.7,
		"earn cash": 0.6, "act now": 0.4, "limited offer": 0.5,
		"congratulations you won": 0.8,
	},
	"misinformation": {
		"fake": 0.3, "hoax": 0.5, "conspiracy": 0.4,
		"fabricated": 0.5,
	},
}

// ModerateContent performs multi-category content analysis with configurable severity scoring.
func (s *aiService) ModerateContent(ctx context.Context, req *models.ModerationRequest) (*models.ModerationResponse, error) {
	content := strings.ToLower(req.Content)

	var (
		categories []string
		details    []models.CategoryDetail
		maxScore   float64
		allReasons []string
	)

	for category, keywords := range moderationDict {
		var (
			categoryScore float64
			matches       []string
			matchCount    int
		)

		for keyword, weight := range keywords {
			count := strings.Count(content, keyword)
			if count > 0 {
				matchCount += count
				categoryScore += weight * float64(count)
				matches = append(matches, keyword)
			}
		}

		if matchCount > 0 {
			// Normalize category score: cap at 1.0
			normalizedScore := math.Min(categoryScore/float64(matchCount+1), 1.0)

			categories = append(categories, category)
			details = append(details, models.CategoryDetail{
				Category: category,
				Score:    math.Round(normalizedScore*100) / 100,
				Matches:  matches,
			})

			if normalizedScore > maxScore {
				maxScore = normalizedScore
			}

			allReasons = append(allReasons, category+": "+strings.Join(matches, ", "))
		}
	}

	isFlagged := maxScore > 0.4
	reason := ""
	if len(allReasons) > 0 {
		reason = "Detected: " + strings.Join(allReasons, "; ")
	}

	response := &models.ModerationResponse{
		IsFlagged:   isFlagged,
		Score:       math.Round(maxScore*100) / 100,
		Categories:  categories,
		Details:     details,
		Reason:      reason,
		ProcessedAt: time.Now(),
	}

	slog.Info("AI moderation complete",
		slog.Bool("flagged", isFlagged),
		slog.Float64("score", maxScore),
		slog.Int("categories_detected", len(categories)))

	return response, nil
}
