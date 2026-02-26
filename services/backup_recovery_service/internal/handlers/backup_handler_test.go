package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/chifamba/dzinza/services/backup_recovery_service/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockBackupService is a mock implementation of service.BackupService
type MockBackupService struct {
	mock.Mock
}

func (m *MockBackupService) PerformBackup(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func (m *MockBackupService) RestoreBackup(ctx context.Context, backupTimestamp string) error {
	args := m.Called(ctx, backupTimestamp)
	return args.Error(0)
}

func (m *MockBackupService) ListBackups(ctx context.Context) ([]service.BackupInfo, error) {
	args := m.Called(ctx)
	return args.Get(0).([]service.BackupInfo), args.Error(1)
}

func TestRunBackup_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockSvc := new(MockBackupService)
	mockSvc.On("PerformBackup", mock.Anything).Return(nil)

	handler := NewBackupHandler(mockSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/api/v1/backup/run", nil)

	handler.RunBackup(c)

	assert.Equal(t, http.StatusOK, w.Code)
	mockSvc.AssertExpectations(t)
}

func TestRunBackup_Failure(t *testing.T) {
	gin.SetMode(gin.TestMode)
	mockSvc := new(MockBackupService)
	mockSvc.On("PerformBackup", mock.Anything).Return(errors.New("backup failed"))

	handler := NewBackupHandler(mockSvc)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/api/v1/backup/run", nil)

	handler.RunBackup(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	mockSvc.AssertExpectations(t)
}
