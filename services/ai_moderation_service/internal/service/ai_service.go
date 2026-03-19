package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

// AIService defines the interface for AI content moderation.
type AIService interface {
	ModerateContent(ctx context.Context, req *models.ModerationRequest) (*models.ModerationResponse, error)
}

type aiService struct{
	httpClient *http.Client
}

// NewAIService creates a new AI moderation service.
func NewAIService() AIService {
	return &aiService{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// openAIRequest represents a request to the OpenAI Moderation API.
type openAIRequest struct {
	Input string `json:"input"`
}

// openAIResponse represents the response from the OpenAI Moderation API.
type openAIResponse struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Results []struct {
		Flagged        bool               `json:"flagged"`
		Categories     map[string]bool    `json:"categories"`
		CategoryScores map[string]float64 `json:"category_scores"`
	} `json:"results"`
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
// It tries to use the OpenAI Moderation API if OPENAI_API_KEY is set, otherwise falls back to local keywords.
func (s *aiService) ModerateContent(ctx context.Context, req *models.ModerationRequest) (*models.ModerationResponse, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey != "" {
		resp, err := s.callOpenAIModeration(ctx, apiKey, req.Content)
		if err == nil {
			return resp, nil
		}
		slog.Warn("OpenAI moderation failed, falling back to local keyword check", slog.Any("error", err))
	}

	return s.fallbackKeywordModeration(req)
}

func (s *aiService) callOpenAIModeration(ctx context.Context, apiKey, content string) (*models.ModerationResponse, error) {
	apiURL := "https://api.openai.com/v1/moderations"

	reqBody, err := json.Marshal(openAIRequest{Input: content})
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("openai returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var openAIResp openAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&openAIResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(openAIResp.Results) == 0 {
		return nil, fmt.Errorf("no results in openai response")
	}

	result := openAIResp.Results[0]

	var categories []string
	var details []models.CategoryDetail
	var allReasons []string
	maxScore := 0.0

	for cat, flagged := range result.Categories {
		score := result.CategoryScores[cat]
		if score > maxScore {
			maxScore = score
		}
		if flagged {
			categories = append(categories, cat)
			details = append(details, models.CategoryDetail{
				Category: cat,
				Score:    math.Round(score*100) / 100,
			})
			allReasons = append(allReasons, cat)
		}
	}

	reason := ""
	if len(allReasons) > 0 {
		reason = "Detected: " + strings.Join(allReasons, "; ")
	}

	response := &models.ModerationResponse{
		IsFlagged:   result.Flagged,
		Score:       math.Round(maxScore*100) / 100,
		Categories:  categories,
		Details:     details,
		Reason:      reason,
		ProcessedAt: time.Now(),
	}

	slog.Info("OpenAI moderation complete",
		slog.Bool("flagged", result.Flagged),
		slog.Float64("score", maxScore),
		slog.Int("categories_detected", len(categories)))

	return response, nil
}

func (s *aiService) fallbackKeywordModeration(req *models.ModerationRequest) (*models.ModerationResponse, error) {
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
