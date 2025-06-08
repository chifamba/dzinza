import { Client } from '@elastic/elasticsearch';
import { logger } from '../../../shared/utils/logger';

export interface SearchDocument {
  id: string;
  type: 'person' | 'record' | 'document' | 'location';
  title: string;
  content: string;
  metadata: Record<string, any>;
  userId: string;
  familyTreeId?: string;
  privacy: 'public' | 'private' | 'family';
  created: Date;
  updated: Date;
}

export interface SearchQuery {
  query?: string;
  type?: string[];
  userId?: string;
  familyTreeId?: string;
  privacy?: string[];
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  location?: {
    field: string;
    value: string;
    radius?: string;
  };
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  page?: number;
  size?: number;
}

export interface SearchResult {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: SearchDocument;
    highlight?: Record<string, string[]>;
  }>;
  aggregations?: Record<string, any>;
  suggestions?: string[];
}

export interface PersonSearchParams {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  fuzzyMatch?: boolean;
  familyTreeId?: string;
}

export class ElasticsearchService {
  private static client: Client;
  private static readonly SEARCH_INDEX = 'dzinza_search';
  private static readonly ANALYTICS_INDEX = 'dzinza_analytics';

  static async initialize(): Promise<void> {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_AUTH ? {
        username: process.env.ELASTICSEARCH_USERNAME || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      } : undefined,
      requestTimeout: 30000,
      pingTimeout: 3000,
      maxRetries: 3
    });

    // Test connection
    try {
      await this.client.ping();
      logger.info('Connected to Elasticsearch');
    } catch (error) {
      logger.error('Failed to connect to Elasticsearch:', error);
      throw error;
    }

    // Create indices if they don't exist
    await this.createIndices();
  }

  private static async createIndices(): Promise<void> {
    try {
      // Create search index
      const searchIndexExists = await this.client.indices.exists({
        index: this.SEARCH_INDEX
      });

      if (!searchIndexExists) {
        await this.client.indices.create({
          index: this.SEARCH_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0,
              analysis: {
                analyzer: {
                  name_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'metaphone']
                  },
                  location_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding']
                  }
                },
                filter: {
                  metaphone: {
                    type: 'phonetic',
                    encoder: 'metaphone',
                    replace: false
                  }
                }
              }
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                type: { type: 'keyword' },
                title: {
                  type: 'text',
                  analyzer: 'name_analyzer',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: {
                      type: 'completion',
                      analyzer: 'simple'
                    }
                  }
                },
                content: {
                  type: 'text',
                  analyzer: 'standard'
                },
                metadata: {
                  type: 'object',
                  properties: {
                    firstName: {
                      type: 'text',
                      analyzer: 'name_analyzer',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    lastName: {
                      type: 'text',
                      analyzer: 'name_analyzer',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    birthDate: { type: 'date' },
                    deathDate: { type: 'date' },
                    birthPlace: {
                      type: 'text',
                      analyzer: 'location_analyzer',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    deathPlace: {
                      type: 'text',
                      analyzer: 'location_analyzer',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    gender: { type: 'keyword' },
                    occupation: {
                      type: 'text',
                      fields: { keyword: { type: 'keyword' } }
                    },
                    tags: { type: 'keyword' }
                  }
                },
                userId: { type: 'keyword' },
                familyTreeId: { type: 'keyword' },
                privacy: { type: 'keyword' },
                created: { type: 'date' },
                updated: { type: 'date' },
                location: { type: 'geo_point' }
              }
            }
          }
        });
        logger.info('Created search index');
      }

      // Create analytics index
      const analyticsIndexExists = await this.client.indices.exists({
        index: this.ANALYTICS_INDEX
      });

      if (!analyticsIndexExists) {
        await this.client.indices.create({
          index: this.ANALYTICS_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0
            },
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                sessionId: { type: 'keyword' },
                query: { type: 'text' },
                type: { type: 'keyword' },
                resultsCount: { type: 'integer' },
                timestamp: { type: 'date' },
                clickedResults: { type: 'keyword' },
                filters: { type: 'object' },
                duration: { type: 'integer' }
              }
            }
          }
        });
        logger.info('Created analytics index');
      }
    } catch (error) {
      logger.error('Error creating indices:', error);
      throw error;
    }
  }

  static async indexDocument(document: SearchDocument): Promise<void> {
    try {
      await this.client.index({
        index: this.SEARCH_INDEX,
        id: document.id,
        body: document
      });
      logger.debug(`Indexed document: ${document.id}`);
    } catch (error) {
      logger.error(`Error indexing document ${document.id}:`, error);
      throw error;
    }
  }

  static async updateDocument(id: string, updates: Partial<SearchDocument>): Promise<void> {
    try {
      await this.client.update({
        index: this.SEARCH_INDEX,
        id,
        body: {
          doc: updates
        }
      });
      logger.debug(`Updated document: ${id}`);
    } catch (error) {
      logger.error(`Error updating document ${id}:`, error);
      throw error;
    }
  }

  static async deleteDocument(id: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.SEARCH_INDEX,
        id
      });
      logger.debug(`Deleted document: ${id}`);
    } catch (error) {
      logger.error(`Error deleting document ${id}:`, error);
      throw error;
    }
  }

  static async search(searchQuery: SearchQuery): Promise<SearchResult> {
    try {
      const {
        query,
        type,
        userId,
        familyTreeId,
        privacy,
        dateRange,
        location,
        sort,
        page = 1,
        size = 20
      } = searchQuery;

      const must: any[] = [];
      const filter: any[] = [];

      // Text query
      if (query) {
        must.push({
          multi_match: {
            query,
            fields: [
              'title^3',
              'content^2',
              'metadata.firstName^4',
              'metadata.lastName^4',
              'metadata.birthPlace^2',
              'metadata.deathPlace^2',
              'metadata.occupation'
            ],
            fuzziness: 'AUTO',
            operator: 'and'
          }
        });
      }

      // Type filter
      if (type && type.length > 0) {
        filter.push({
          terms: { type }
        });
      }

      // User filter
      if (userId) {
        filter.push({
          term: { userId }
        });
      }

      // Family tree filter
      if (familyTreeId) {
        filter.push({
          term: { familyTreeId }
        });
      }

      // Privacy filter
      if (privacy && privacy.length > 0) {
        filter.push({
          terms: { privacy }
        });
      }

      // Date range filter
      if (dateRange) {
        const dateFilter: any = {
          range: {
            [dateRange.field]: {}
          }
        };
        if (dateRange.from) dateFilter.range[dateRange.field].gte = dateRange.from;
        if (dateRange.to) dateFilter.range[dateRange.field].lte = dateRange.to;
        filter.push(dateFilter);
      }

      // Location filter
      if (location) {
        filter.push({
          geo_distance: {
            distance: location.radius || '50km',
            [location.field]: location.value
          }
        });
      }

      const searchBody: any = {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        highlight: {
          fields: {
            title: {},
            content: {},
            'metadata.firstName': {},
            'metadata.lastName': {},
            'metadata.birthPlace': {},
            'metadata.deathPlace': {}
          }
        },
        aggregations: {
          types: {
            terms: { field: 'type' }
          },
          privacy: {
            terms: { field: 'privacy' }
          },
          created_date: {
            date_histogram: {
              field: 'created',
              calendar_interval: 'year'
            }
          }
        },
        from: (page - 1) * size,
        size
      };

      // Sorting
      if (sort) {
        searchBody.sort = [
          {
            [sort.field]: {
              order: sort.order
            }
          }
        ];
      } else {
        // Default sorting by relevance and date
        searchBody.sort = [
          '_score',
          { updated: { order: 'desc' } }
        ];
      }

      const result = await this.client.search({
        index: this.SEARCH_INDEX,
        body: searchBody
      });

      return {
        total: typeof result.body.hits.total === 'object' 
          ? result.body.hits.total.value 
          : result.body.hits.total,
        hits: result.body.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight
        })),
        aggregations: result.body.aggregations,
        suggestions: await this.getSuggestions(query || '')
      };
    } catch (error) {
      logger.error('Search error:', error);
      throw error;
    }
  }

  static async searchPerson(params: PersonSearchParams, userId: string): Promise<SearchResult> {
    try {
      const must: any[] = [];
      const should: any[] = [];

      // Build query based on parameters
      if (params.firstName) {
        must.push({
          match: {
            'metadata.firstName': {
              query: params.firstName,
              fuzziness: params.fuzzyMatch ? 'AUTO' : 0
            }
          }
        });
      }

      if (params.lastName) {
        must.push({
          match: {
            'metadata.lastName': {
              query: params.lastName,
              fuzziness: params.fuzzyMatch ? 'AUTO' : 0
            }
          }
        });
      }

      if (params.birthDate) {
        should.push({
          match: {
            'metadata.birthDate': params.birthDate
          }
        });
      }

      if (params.birthPlace) {
        should.push({
          match: {
            'metadata.birthPlace': {
              query: params.birthPlace,
              fuzziness: params.fuzzyMatch ? 'AUTO' : 0
            }
          }
        });
      }

      if (params.deathDate) {
        should.push({
          match: {
            'metadata.deathDate': params.deathDate
          }
        });
      }

      if (params.deathPlace) {
        should.push({
          match: {
            'metadata.deathPlace': {
              query: params.deathPlace,
              fuzziness: params.fuzzyMatch ? 'AUTO' : 0
            }
          }
        });
      }

      const filter: any[] = [
        { term: { type: 'person' } },
        { term: { userId } }
      ];

      if (params.familyTreeId) {
        filter.push({ term: { familyTreeId: params.familyTreeId } });
      }

      const result = await this.client.search({
        index: this.SEARCH_INDEX,
        body: {
          query: {
            bool: {
              must: must.length > 0 ? must : [{ match_all: {} }],
              should,
              filter,
              minimum_should_match: should.length > 0 ? 1 : 0
            }
          },
          sort: [
            '_score',
            { 'metadata.lastName.keyword': { order: 'asc' } },
            { 'metadata.firstName.keyword': { order: 'asc' } }
          ]
        }
      });

      return {
        total: typeof result.body.hits.total === 'object' 
          ? result.body.hits.total.value 
          : result.body.hits.total,
        hits: result.body.hits.hits.map((hit: any) => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight
        })),
        aggregations: result.body.aggregations
      };
    } catch (error) {
      logger.error('Person search error:', error);
      throw error;
    }
  }

  static async getSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      const result = await this.client.search({
        index: this.SEARCH_INDEX,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size: 5
              }
            }
          }
        }
      });

      return result.body.suggest.title_suggest[0].options.map((option: any) => option.text);
    } catch (error) {
      logger.error('Suggestions error:', error);
      return [];
    }
  }

  static async logSearch(searchData: any): Promise<void> {
    try {
      await this.client.index({
        index: this.ANALYTICS_INDEX,
        body: {
          ...searchData,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Error logging search:', error);
    }
  }

  static async getSearchAnalytics(userId?: string, dateRange?: { from: string; to: string }): Promise<any> {
    try {
      const filter: any[] = [];

      if (userId) {
        filter.push({ term: { userId } });
      }

      if (dateRange) {
        filter.push({
          range: {
            timestamp: {
              gte: dateRange.from,
              lte: dateRange.to
            }
          }
        });
      }

      const result = await this.client.search({
        index: this.ANALYTICS_INDEX,
        body: {
          query: {
            bool: { filter }
          },
          aggregations: {
            search_volume: {
              date_histogram: {
                field: 'timestamp',
                calendar_interval: 'day'
              }
            },
            popular_queries: {
              terms: {
                field: 'query.keyword',
                size: 10
              }
            },
            search_types: {
              terms: {
                field: 'type',
                size: 10
              }
            },
            avg_results: {
              avg: {
                field: 'resultsCount'
              }
            }
          },
          size: 0
        }
      });

      return result.body.aggregations;
    } catch (error) {
      logger.error('Analytics error:', error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      logger.info('Elasticsearch connection closed');
    }
  }
}
