package models

import "time"

type PlatformMetrics struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TotalUsers    int64     `json:"total_users"`
	TotalTrees    int64     `json:"total_trees"`
	TotalPersons  int64     `json:"total_persons"`
	ActiveUsers   int64     `json:"active_users"` // Last 24h
	Timestamp     time.Time `json:"timestamp"`
}

type EventMetric struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	EventType string    `json:"event_type"`
	Count     int64     `json:"count"`
	Date      time.Time `json:"date"`
}
