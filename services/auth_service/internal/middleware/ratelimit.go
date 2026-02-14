package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// RateLimitMiddleware limits requests based on IP address using Redis.
func RateLimitMiddleware(rdb *redis.Client, limit int, duration time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s", ip)

		count, err := rdb.Incr(c.Request.Context(), key).Result()
		if err != nil {
			// If Redis is down, we log error but allow request to proceed (fail open)
			// Ideally we should log this error using the service logger, but we don't have access to it here easily.
			// For now, proceed.
			c.Next()
			return
		}

		if count == 1 {
			rdb.Expire(c.Request.Context(), key, duration)
		}

		if count > int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		c.Next()
	}
}
