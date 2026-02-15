package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/chifamba/dzinza/services/graph_query_service/internal/handlers"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/repository"
	"github.com/chifamba/dzinza/services/graph_query_service/internal/service"
	"github.com/chifamba/dzinza/services/pkg/config"
	"github.com/chifamba/dzinza/services/pkg/health"
	"github.com/chifamba/dzinza/services/pkg/logging"
	"github.com/gin-gonic/gin"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	logger := logging.NewLogger("graph_query_service")

	cfg, err := config.LoadConfig(".")
	if err != nil {
		logger.Error("failed to load config", slog.Any("error", err))
		os.Exit(1)
	}

	// Neo4j connection
	neo4jURI := cfg.Neo4jURI
	neo4jUser := cfg.Neo4jUser
	neo4jPass := cfg.Neo4jPassword

	driver, err := neo4j.NewDriverWithContext(neo4jURI, neo4j.BasicAuth(neo4jUser, neo4jPass, ""))
	if err != nil {
		logger.Error("failed to create neo4j driver", slog.Any("error", err))
		os.Exit(1)
	}
	defer driver.Close(context.Background())

	if err := driver.VerifyConnectivity(context.Background()); err != nil {
		logger.Error("failed to verify neo4j connectivity", slog.Any("error", err))
		os.Exit(1)
	}

	// Initialize layers
	repo := repository.NewNeo4jRepository(driver)
	svc := service.NewGraphQueryService(repo)
	gqlHandler, err := handlers.NewGraphQLHandler(svc)
	if err != nil {
		logger.Error("failed to create graphql handler", slog.Any("error", err))
		os.Exit(1)
	}

	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.Logger())

	r.GET("/health", health.HealthCheckHandler("graph_query_service"))

	r.POST("/graphql", gqlHandler.Handle)
	// Optional: add GraphiQL for easy testing in dev
	r.GET("/graphql", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html", []byte(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>GraphiQL</title>
				<link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
			</head>
			<body style="margin: 0;">
				<div id="graphiql" style="height: 100vh;"></div>
				<script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
				<script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
				<script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
				<script>
					const fetcher = GraphiQL.makeFetcher({ url: '/graphql' });
					ReactDOM.render(
						React.createElement(GraphiQL, { fetcher: fetcher }),
						document.getElementById('graphiql'),
					);
				</script>
			</body>
			</html>
		`))
	})

	port := 8007 // Default for graph_query_service
	addr := fmt.Sprintf(":%d", port)
	logger.Info("starting graph_query_service", slog.String("addr", addr))

	if err := r.Run(addr); err != nil {
		logger.Error("server failed to start", slog.Any("error", err))
		os.Exit(1)
	}
}
