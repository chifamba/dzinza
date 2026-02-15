package models

// CreateAuditLogRequest defines the payload for creating a new audit log entry.
type CreateAuditLogRequest struct {
	UserID     string      `json:"user_id" binding:"required,uuid"`
	Action     string      `json:"action" binding:"required"`
	EntityType string      `json:"entity_type" binding:"required"`
	EntityID   string      `json:"entity_id" binding:"required"`
	OldValue   interface{} `json:"old_value"`
	NewValue   interface{} `json:"new_value"`
	IPAddress  string      `json:"ip_address"`
}

// AuditLogQuery defines the filters for querying audit logs.
type AuditLogQuery struct {
	UserID     string `form:"user_id"`
	Action     string `form:"action"`
	EntityType string `form:"entity_type"`
	EntityID   string `form:"entity_id"`
	Page       int    `form:"page,default=1"`
	Limit      int    `form:"limit,default=20"`
}
