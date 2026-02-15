package service

import (
	"context"
	"testing"

	"github.com/chifamba/dzinza/services/localization_service/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockRepo struct {
	mock.Mock
}

func (m *MockRepo) GetTranslation(ctx context.Context, key, locale string) (*models.Translation, error) {
	args := m.Called(ctx, key, locale)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Translation), args.Error(1)
}

func (m *MockRepo) ListTranslations(ctx context.Context, locale string) ([]models.Translation, error) {
	args := m.Called(ctx, locale)
	return args.Get(0).([]models.Translation), args.Error(1)
}

func (m *MockRepo) SaveTranslation(ctx context.Context, translation *models.Translation) error {
	args := m.Called(ctx, translation)
	return args.Error(0)
}

func (m *MockRepo) GetCulturalNamePattern(ctx context.Context, cultureCode string) (*models.CulturalNamePattern, error) {
	args := m.Called(ctx, cultureCode)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.CulturalNamePattern), args.Error(1)
}

func TestParseCulturalName(t *testing.T) {
	repo := &MockRepo{}

	repo.On("GetCulturalNamePattern", mock.Anything, "ZW-SHONA").Return(&models.CulturalNamePattern{
		CultureCode: "ZW-SHONA",
		Pattern:     `^(?P<given_name>\w+)\s+(?P<surname>\w+)$`,
	}, nil)

	svc := NewLocalizationService(repo)

	result, err := svc.ParseCulturalName(context.Background(), "Tinashe Chifamba", "ZW-SHONA")
	assert.NoError(t, err)
	assert.Equal(t, "Tinashe", result["given_name"])
	assert.Equal(t, "Chifamba", result["surname"])
	assert.Equal(t, "true", result["parsed"])
}
