package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/repository"
	"github.com/chifamba/dzinza/services/pkg/events"
)

// ModerationService defines the interface for content moderation operations.
type ModerationService interface {
	FlagContent(ctx context.Context, contentType, contentID, content, reason, reporterID string) (*models.FlaggedContent, error)
	BanUser(ctx context.Context, userID, bannedBy, reason string, expiresAt *time.Time) error
	ReviewFlaggedContent(ctx context.Context, flagID, reviewerID, action, note string) error
	ListFlagged(ctx context.Context) ([]models.FlaggedContent, error)
	ListReviewQueue(ctx context.Context) ([]models.FlaggedContent, error)
}

type moderationService struct {
	repo       repository.ModerationRepository
	eventBus   events.Bus
	httpClient *http.Client
}

// NewModerationService creates a moderation service with AI moderation integration.
func NewModerationService(repo repository.ModerationRepository, eventBus events.Bus) ModerationService {
	return &moderationService{
		repo:     repo,
		eventBus: eventBus,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Auto-flag threshold: content with AI score above this is automatically flagged.
const autoFlagThreshold = 0.7

// FlagContent flags content and sends it to the AI moderation service for analysis.
// If the AI score exceeds the threshold, the content is automatically flagged.
func (s *moderationService) FlagContent(ctx context.Context, contentType, contentID, content, reason, reporterID string) (*models.FlaggedContent, error) {
	flagged := &models.FlaggedContent{
		ID:          fmt.Sprintf("flag_%d", time.Now().UnixNano()),
		ContentType: contentType,
		ContentID:   contentID,
		Content:     content,
		Reason:      reason,
		ReporterID:  reporterID,
		Status:      "PENDING",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Call AI moderation service synchronously
	aiResult, err := s.callAIModeration(ctx, content, contentType)
	if err != nil {
		slog.Warn("AI moderation call failed, queuing content for manual review",
			slog.String("content_id", contentID),
			slog.Any("error", err))
	} else {
		flagged.AIScore = aiResult.Score
		flagged.AICategories = strings.Join(aiResult.Categories, ",")

		// Auto-flag on high AI score
		if aiResult.Score >= autoFlagThreshold {
			flagged.Status = "AUTO_FLAGGED"
			slog.Info("content auto-flagged by AI",
				slog.String("content_id", contentID),
				slog.Float64("ai_score", aiResult.Score))
		}
	}

	if err := s.repo.CreateFlaggedContent(ctx, flagged); err != nil {
		return nil, fmt.Errorf("failed to save flagged content: %w", err)
	}

	return flagged, nil
}

// ReviewFlaggedContent allows a moderator to review flagged content.
func (s *moderationService) ReviewFlaggedContent(ctx context.Context, flagID, reviewerID, action, note string) error {
	flagged, err := s.repo.GetFlaggedContentByID(ctx, flagID)
	if err != nil {
		return fmt.Errorf("failed to get flagged content: %w", err)
	}

	now := time.Now()
	flagged.ReviewedBy = reviewerID
	flagged.ReviewNote = note
	flagged.ReviewedAt = &now
	flagged.UpdatedAt = now

	switch action {
	case "REMOVE":
		flagged.Status = "REMOVED"
	case "DISMISS":
		flagged.Status = "DISMISSED"
	default:
		return fmt.Errorf("invalid action: %s (expected REMOVE or DISMISS)", action)
	}

	if err := s.repo.UpdateFlaggedContent(ctx, flagged); err != nil {
		return fmt.Errorf("failed to update flagged content: %w", err)
	}

	return nil
}

// BanUser bans a user and publishes a user.banned event.
func (s *moderationService) BanUser(ctx context.Context, userID, bannedBy, reason string, expiresAt *time.Time) error {
	ban := &models.UserBan{
		ID:        fmt.Sprintf("ban_%d", time.Now().UnixNano()),
		UserID:    userID,
		BannedBy:  bannedBy,
		Reason:    reason,
		BannedAt:  time.Now(),
		ExpiresAt: expiresAt,
	}

	if err := s.repo.CreateBan(ctx, ban); err != nil {
		return fmt.Errorf("failed to create ban: %w", err)
	}

	pubErr := s.eventBus.Publish(ctx, events.UserBanned, events.UserBannedPayload{
		UserID:   userID,
		BannedBy: bannedBy,
		Reason:   reason,
	})
	if pubErr != nil {
		slog.Warn("failed to publish user.banned event",
			slog.String("user_id", userID),
			slog.Any("error", pubErr))
	}

	return nil
}

// ListFlagged returns all flagged content.
func (s *moderationService) ListFlagged(ctx context.Context) ([]models.FlaggedContent, error) {
	return s.repo.ListFlaggedContent(ctx)
}

// ListReviewQueue returns content that needs human review (PENDING or AUTO_FLAGGED).
func (s *moderationService) ListReviewQueue(ctx context.Context) ([]models.FlaggedContent, error) {
	return s.repo.ListByStatus(ctx, "PENDING", "AUTO_FLAGGED")
}

// aiModerationResponse represents the response from ai_moderation_service.
type aiModerationResponse struct {
	Data *struct {
		IsFlagged  bool     `json:"is_flagged"`
		Score      float64  `json:"score"`
		Categories []string `json:"categories"`
		Reason     string   `json:"reason"`
	} `json:"data"`
}

// callAIModeration sends content to the AI moderation service for analysis.
func (s *moderationService) callAIModeration(ctx context.Context, content, contentType string) (*struct {
	Score      float64
	Categories []string
}, error) {
	aiURL := os.Getenv("AI_MODERATION_SERVICE_URL")
	if aiURL == "" {
		aiURL = "http://ai_moderation_service:8015"
	}

	payload := fmt.Sprintf(`{"content": %q, "content_type": %q}`, content, contentType)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/api/v1/moderate", aiURL),
		strings.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("failed to create AI moderation request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call AI moderation service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI moderation service returned status %d: %s", resp.StatusCode, string(body))
	}

	var aiResp aiModerationResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return nil, fmt.Errorf("failed to decode AI moderation response: %w", err)
	}

	if aiResp.Data == nil {
		return nil, fmt.Errorf("AI moderation service returned nil data")
	}

	return &struct {
		Score      float64
		Categories []string
	}{
		Score:      aiResp.Data.Score,
		Categories: aiResp.Data.Categories,
	}, nil
}
