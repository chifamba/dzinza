package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/models"
	"github.com/chifamba/dzinza/services/admin_moderation_service/internal/repository"
	"github.com/chifamba/dzinza/services/pkg/events"
)

type ModerationService interface {
	FlagContent(ctx context.Context, flagged *models.FlaggedContent) error
	BanUser(ctx context.Context, ban *models.UserBan) error
	ListFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error)
}

type moderationService struct {
	repo     repository.ModerationRepository
	eventBus events.Bus
}

func NewModerationService(repo repository.ModerationRepository, eventBus events.Bus) ModerationService {
	return &moderationService{
		repo:     repo,
		eventBus: eventBus,
	}
}

func (s *moderationService) FlagContent(ctx context.Context, flagged *models.FlaggedContent) error {
	flagged.CreatedAt = time.Now()
	flagged.Status = "PENDING"

	// Wire to AI moderation service
	go s.callAIModeration(flagged)

	return s.repo.FlagContent(ctx, flagged)
}

func (s *moderationService) callAIModeration(flagged *models.FlaggedContent) {
	aiServiceURL := os.Getenv("AI_MODERATION_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://ai_moderation_service:8015/api/v1/ai/moderate"
	}

	payload := map[string]string{
		"content":      flagged.Reason, // Using reason as proxy for content to moderate for now
		"content_type": "TEXT",
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(aiServiceURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		fmt.Printf("AI moderation call failed: %v\n", err)
		return
	}
	defer resp.Body.Close()

	// In a real implementation, we would update the flagged item status based on AI response
}

func (s *moderationService) BanUser(ctx context.Context, ban *models.UserBan) error {
	ban.BannedAt = time.Now()
	if err := s.repo.BanUser(ctx, ban); err != nil {
		return err
	}

	// Publish event
	_ = s.eventBus.Publish(ctx, events.UserBanned, events.UserBannedPayload{
		UserID:   ban.UserID,
		BannedBy: ban.BannedBy,
		Reason:   ban.Reason,
	})

	return nil
}

func (s *moderationService) ListFlaggedContent(ctx context.Context) ([]models.FlaggedContent, error) {
	return s.repo.GetFlaggedContent(ctx)
}
