package service

import (
	"context"
	"strings"

	"github.com/chifamba/dzinza/services/ai_moderation_service/internal/models"
)

type AIService interface {
	ModerateContent(ctx context.Context, content, contentType string) (*models.ModerationResponse, error)
}

type aiService struct{}

func NewAIService() AIService {
	return &aiService{}
}

func (s *aiService) ModerateContent(ctx context.Context, content, contentType string) (*models.ModerationResponse, error) {
	// Simulated AI logic
	badWords := []string{"badword1", "badword2"}
	isSafe := true
	reason := ""
	var categories []string

	for _, word := range badWords {
		if strings.Contains(strings.ToLower(content), word) {
			isSafe = false
			reason = "Contains prohibited language"
			categories = append(categories, "PROHIBITED_LANGUAGE")
			break
		}
	}

	return &models.ModerationResponse{
		IsSafe:     isSafe,
		Reason:     reason,
		Categories: categories,
	}, nil
}
