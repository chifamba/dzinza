package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/chifamba/dzinza/services/search_discovery_service/internal/models"
	"github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

type SearchRepository interface {
	CreateIndex(ctx context.Context) error
	IndexPerson(ctx context.Context, person models.PersonIndex) error
	SearchPersons(ctx context.Context, query string, filters map[string]interface{}, offset, limit int) (*models.SearchResponse, error)
	DeletePerson(ctx context.Context, id string) error
}

type elasticRepository struct {
	client *elasticsearch.Client
	index  string
}

func NewElasticsearchRepository(client *elasticsearch.Client, index string) SearchRepository {
	return &elasticRepository{
		client: client,
		index:  index,
	}
}

func (r *elasticRepository) CreateIndex(ctx context.Context) error {
	mapping := `{
		"settings": {
			"number_of_shards": 1,
			"number_of_replicas": 0
		},
		"mappings": {
			"properties": {
				"id": { "type": "keyword" },
				"tree_id": { "type": "keyword" },
				"primary_name": {
					"properties": {
						"given_name": { "type": "text", "analyzer": "standard" },
						"surname": { "type": "text", "analyzer": "standard" },
						"nickname": { "type": "text", "analyzer": "standard" }
					}
				},
				"alternate_names": {
					"type": "nested",
					"properties": {
						"given_name": { "type": "text" },
						"surname": { "type": "text" }
					}
				},
				"gender": { "type": "keyword" },
				"birth_place": { "type": "text" },
				"death_place": { "type": "text" },
				"biography": { "type": "text" },
				"clan": { "type": "text" },
				"tribe": { "type": "text" },
				"is_living": { "type": "boolean" },
				"created_at": { "type": "date" },
				"updated_at": { "type": "date" }
			}
		}
	}`

	req := esapi.IndicesCreateRequest{
		Index: r.index,
		Body:  strings.NewReader(mapping),
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return fmt.Errorf("failed to create index: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() && res.StatusCode != 400 { // Ignore 400 (already exists)
		return fmt.Errorf("error creating index: %s", res.String())
	}

	return nil
}

func (r *elasticRepository) IndexPerson(ctx context.Context, person models.PersonIndex) error {
	data, err := json.Marshal(person)
	if err != nil {
		return fmt.Errorf("failed to marshal person: %w", err)
	}

	req := esapi.IndexRequest{
		Index:      r.index,
		DocumentID: person.ID,
		Body:       bytes.NewReader(data),
		Refresh:    "true",
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return fmt.Errorf("failed to index person: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return fmt.Errorf("error indexing person: %s", res.String())
	}

	return nil
}

func (r *elasticRepository) DeletePerson(ctx context.Context, id string) error {
	req := esapi.DeleteRequest{
		Index:      r.index,
		DocumentID: id,
		Refresh:    "true",
	}

	res, err := req.Do(ctx, r.client)
	if err != nil {
		return fmt.Errorf("failed to delete person: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() && res.StatusCode != 404 {
		return fmt.Errorf("error deleting person: %s", res.String())
	}

	return nil
}

func (r *elasticRepository) SearchPersons(ctx context.Context, query string, filters map[string]interface{}, offset, limit int) (*models.SearchResponse, error) {
	var buf bytes.Buffer
	
	searchQuery := map[string]interface{}{
		"from": offset,
		"size": limit,
		"query": map[string]interface{}{
			"bool": map[string]interface{}{
				"must": []interface{}{
					map[string]interface{}{
						"multi_match": map[string]interface{}{
							"query": query,
							"fields": []string{
								"primary_name.given_name^3",
								"primary_name.surname^3",
								"primary_name.nickname^2",
								"alternate_names.given_name",
								"alternate_names.surname",
								"biography",
								"clan",
								"tribe",
							},
						},
					},
				},
			},
		},
	}

	// Add filters if any
	// ... (implementation omitted for brevity, but could add filter terms)

	if err := json.NewEncoder(&buf).Encode(searchQuery); err != nil {
		return nil, fmt.Errorf("failed to encode search query: %w", err)
	}

	res, err := r.client.Search(
		r.client.Search.WithContext(ctx),
		r.client.Search.WithIndex(r.index),
		r.client.Search.WithBody(&buf),
		r.client.Search.WithTrackTotalHits(true),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to search: %w", err)
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, fmt.Errorf("error searching: %s", res.String())
	}

	var rMap map[string]interface{}
	if err := json.NewDecoder(res.Body).Decode(&rMap); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	hits := rMap["hits"].(map[string]interface{})
	total := hits["total"].(map[string]interface{})["value"].(float64)
	
	searchHits := hits["hits"].([]interface{})
	results := make([]models.SearchResult, 0, len(searchHits))

	for _, hit := range searchHits {
		h := hit.(map[string]interface{})
		source, _ := json.Marshal(h["_source"])
		var person models.PersonIndex
		if err := json.Unmarshal(source, &person); err != nil {
			continue
		}
		results = append(results, models.SearchResult{
			Score:  h["_score"].(float64),
			Person: person,
		})
	}

	return &models.SearchResponse{
		Total: int64(total),
		Hits:  results,
	}, nil
}
