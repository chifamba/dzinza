package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
)

// TrustRepository defines the interface for trust data access.
type TrustRepository interface {
	GetTrustScore(ctx context.Context, userID string) (*models.TrustScore, error)
	UpdateTrustScore(ctx context.Context, score *models.TrustScore) error
	GetUserActivityStats(ctx context.Context, userID string) (*models.UserActivityStats, error)
}

type trustRepo struct {
	driver neo4j.DriverWithContext
	redis  *redis.Client
}

// NewTrustRepository creates a new trust repository with Neo4j and Redis backends.
func NewTrustRepository(driver neo4j.DriverWithContext, redis *redis.Client) TrustRepository {
	return &trustRepo{
		driver: driver,
		redis:  redis,
	}
}

func (r *trustRepo) GetTrustScore(ctx context.Context, userID string) (*models.TrustScore, error) {
	// Try Redis cache first
	cacheKey := fmt.Sprintf("trust:score:%s", userID)
	cached, err := r.redis.Get(ctx, cacheKey).Result()
	if err == nil && cached != "" {
		var score models.TrustScore
		if jsonErr := json.Unmarshal([]byte(cached), &score); jsonErr == nil {
			return &score, nil
		}
	}

	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `MATCH (u:User {id: $id}) RETURN u`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": userID})
		if err != nil {
			return nil, err
		}
		if res.Next(ctx) {
			node := res.Record().Values[0].(neo4j.Node)
			props := node.Props

			score, _ := props["trust_score"].(float64)
			acceptedContribs, _ := props["accepted_contributions"].(int64)
			rejectionRate, _ := props["rejection_rate"].(float64)
			accountDays, _ := props["account_longevity_days"].(int64)

			return &models.TrustScore{
				UserID:                userID,
				Score:                 score,
				AcceptedContributions: int(acceptedContribs),
				RejectionRate:         rejectionRate,
				AccountLongevityDays:  int(accountDays),
			}, nil
		}
		return nil, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get trust score from neo4j: %w", err)
	}

	if result == nil {
		return nil, nil
	}

	trustScore := result.(*models.TrustScore)

	// Cache the result in Redis
	if data, jsonErr := json.Marshal(trustScore); jsonErr == nil {
		_ = r.redis.Set(ctx, cacheKey, data, 24*time.Hour).Err()
	}

	return trustScore, nil
}

func (r *trustRepo) UpdateTrustScore(ctx context.Context, score *models.TrustScore) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (u:User {id: $id})
			SET u.trust_score = $score,
				u.accepted_contributions = $accepted,
				u.rejection_rate = $rejection_rate,
				u.account_longevity_days = $account_days,
				u.last_activity_at = $last_activity,
				u.updated_at = $updated_at
			RETURN u
		`
		params := map[string]interface{}{
			"id":              score.UserID,
			"score":           score.Score,
			"accepted":        score.AcceptedContributions,
			"rejection_rate":  score.RejectionRate,
			"account_days":    score.AccountLongevityDays,
			"last_activity":   score.LastActivityAt.Format(time.RFC3339),
			"updated_at":      time.Now().Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to update trust score in neo4j: %w", err)
	}

	// Update Redis cache with serialized JSON
	cacheKey := fmt.Sprintf("trust:score:%s", score.UserID)
	if data, jsonErr := json.Marshal(score); jsonErr == nil {
		_ = r.redis.Set(ctx, cacheKey, data, 24*time.Hour).Err()
	}

	return nil
}

// GetUserActivityStats queries Neo4j for a user's contribution and verification stats.
func (r *trustRepo) GetUserActivityStats(ctx context.Context, userID string) (*models.UserActivityStats, error) {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MATCH (u:User {id: $id})
			OPTIONAL MATCH (u)-[:PROPOSED]->(s:Suggestion)
			WITH u,
				 COUNT(CASE WHEN s.status = 'CONFIRMED' THEN 1 END) AS accepted,
				 COUNT(CASE WHEN s.status = 'REJECTED' THEN 1 END) AS rejected,
				 COUNT(CASE WHEN s.status IS NOT NULL THEN 1 END) AS total_suggestions
			OPTIONAL MATCH (u)-[:VERIFIED]->(v:Suggestion)
			WITH u, accepted, rejected, total_suggestions,
				 COUNT(v) AS verifications
			OPTIONAL MATCH (u)-[:CREATED|UPDATED]->(p:Person)
			WHERE p.updated_at > datetime() - duration({days: 30})
			WITH u, accepted, rejected, verifications,
				 COUNT(p) AS recent_activity
			RETURN accepted, rejected, verifications, recent_activity
		`
		res, err := tx.Run(ctx, query, map[string]interface{}{"id": userID})
		if err != nil {
			return nil, err
		}

		if res.Next(ctx) {
			record := res.Record()
			accepted, _ := record.Get("accepted")
			rejected, _ := record.Get("rejected")
			verifications, _ := record.Get("verifications")
			recentActivity, _ := record.Get("recent_activity")

			return &models.UserActivityStats{
				AcceptedContributions: intFromNeo4j(accepted),
				RejectedContributions: intFromNeo4j(rejected),
				VerificationsDone:     intFromNeo4j(verifications),
				RecentActivityCount:   intFromNeo4j(recentActivity),
			}, nil
		}

		return &models.UserActivityStats{}, nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get user activity stats: %w", err)
	}

	return result.(*models.UserActivityStats), nil
}

// intFromNeo4j safely converts a Neo4j value to int.
func intFromNeo4j(val interface{}) int {
	switch v := val.(type) {
	case int64:
		return int(v)
	case float64:
		return int(v)
	case int:
		return v
	default:
		return 0
	}
}
