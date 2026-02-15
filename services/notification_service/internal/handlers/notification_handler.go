package handlers

import (
	"net/http"
	"strconv"

	"github.com/chifamba/dzinza/services/notification_service/internal/models"
	"github.com/chifamba/dzinza/services/notification_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/auth"
	"github.com/chifamba/dzinza/services/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type NotificationHandler struct {
	svc service.Service
}

func NewNotificationHandler(svc service.Service) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

func (h *NotificationHandler) Notify(c *gin.Context) {
	var req models.CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.svc.Notify(c.Request.Context(), req); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusCreated, gin.H{"status": "notification created"})
}

func (h *NotificationHandler) GetNotifications(c *gin.Context) {
	userIDStr, exists := c.Get(auth.UserIDKey)
	if !exists {
		response.Error(c, http.StatusUnauthorized, "unauthorized")
		return
	}
	userID, _ := uuid.Parse(userIDStr.(string))

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	unreadOnly := c.DefaultQuery("unread_only", "false") == "true"

	notifications, total, err := h.svc.GetNotifications(c.Request.Context(), userID, page, limit, unreadOnly)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	totalPages := (int(total) + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"data":          notifications,
		"page":          page,
		"limit":         limit,
		"total_records": total,
		"total_pages":   totalPages,
	})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid ID")
		return
	}

	if err := h.svc.MarkAsRead(c.Request.Context(), id); err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "notification marked as read"})
}
