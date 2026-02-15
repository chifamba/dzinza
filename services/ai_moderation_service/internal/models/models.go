package models

type ModerationRequest struct {
	Content     string `json:"content"`
	ContentType string `json:"content_type"` // TEXT, IMAGE
}

type ModerationResponse struct {
	IsSafe     bool     `json:"is_safe"`
	Reason     string   `json:"reason,omitempty"`
	Categories []string `json:"categories,omitempty"`
}
