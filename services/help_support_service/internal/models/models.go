package models

import (
	"time"
)

type Ticket struct {
	ID          string    `bson:"_id,omitempty" json:"id"`
	UserID      string    `bson:"user_id" json:"user_id"`
	Subject     string    `bson:"subject" json:"subject"`
	Description string    `bson:"description" json:"description"`
	Category    string    `bson:"category" json:"category"` // BUG, FEATURE, ACCOUNT, DISPUTE, GENERAL
	Status      string    `bson:"status" json:"status"`     // OPEN, IN_PROGRESS, RESOLVED, CLOSED
	Priority    string    `bson:"priority" json:"priority"` // LOW, MEDIUM, HIGH, URGENT
	CreatedAt   time.Time `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time `bson:"updated_at" json:"updated_at"`
	Messages    []Message `bson:"messages" json:"messages"`
}

type Message struct {
	SenderID  string    `bson:"sender_id" json:"sender_id"`
	Content   string    `bson:"content" json:"content"`
	CreatedAt time.Time `bson:"created_at" json:"created_at"`
}
