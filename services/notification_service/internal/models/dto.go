package models

// CreateNotificationRequest defines the payload for creating a new notification.
type CreateNotificationRequest struct {
	UserID  string `json:"user_id" binding:"required,uuid"`
	Type    string `json:"type" binding:"required"`
	Title   string `json:"title" binding:"required"`
	Message string `json:"message" binding:"required"`
}
