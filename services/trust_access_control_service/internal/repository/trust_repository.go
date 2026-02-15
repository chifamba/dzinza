package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/chifamba/dzinza/services/trust_access_control_service/internal/models"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"github.com/redis/go-redis/v9"
)

type TrustRepository interface {
	GetTrustScore(ctx context.Context, userID string) (*models.TrustScore, error)
	UpdateTrustScore(ctx context.Context, score *models.TrustScore) error
}

type trustRepo struct {
	driver neo4j.DriverWithContext
	redis  *redis.Client
}

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
	if err == nil {
		// Found in cache - simplified for brevity, in real app would unmarshal JSON
		_ = cached
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
			
			return &models.TrustScore{
				UserID: userID,
				Score:  score,
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

	return result.(*models.TrustScore), nil
}

func (r *trustRepo) UpdateTrustScore(ctx context.Context, score *models.TrustScore) error {
	session := r.driver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	defer session.Close(ctx)

	_, err := session.ExecuteWrite(ctx, func(tx neo4j.ManagedTransaction) (interface{}, error) {
		query := `
			MERGE (u:User {id: $id})
			SET u.trust_score = $score,
				u.updated_at = $updated_at
			RETURN u
		`
		params := map[string]interface{}{
			"id":         score.UserID,
			"score":      score.Score,
			"updated_at": time.Now().Format(time.RFC3339),
		}
		_, err := tx.Run(ctx, query, params)
		return nil, err
	})

	if err != nil {
		return fmt.Errorf("failed to update trust score in neo4j: %w", err)
	}

	// Update Redis cache
	cacheKey := fmt.Sprintf("trust:score:%s", score.UserID)
	_ = r.redis.Set(ctx, cacheKey, score.Score, 24*time.Hour).Err()

	return nil
}
