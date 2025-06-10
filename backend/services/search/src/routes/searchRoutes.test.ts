import request from 'supertest';
import mongoose from 'mongoose'; // Needed if any ObjectId generation is done, though not primary for ES mock
import { app } from '../server'; // Assuming your Express app is exported from server.ts

// --- Mock Elasticsearch Client ---
const mockEsSearch = jest.fn();
const mockEsIndex = jest.fn();
const mockEsDelete = jest.fn();
const mockEsPing = jest.fn().mockResolvedValue({ body: true }); // Mock ping

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn(() => ({
    search: mockEsSearch,
    index: mockEsIndex,
    delete: mockEsDelete,
    ping: mockEsPing,
  })),
}));
// --- End Mock Elasticsearch Client ---

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));


describe('Search Service API Routes', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockEsSearch.mockClear();
    mockEsIndex.mockClear();
    mockEsDelete.mockClear();
    mockEsPing.mockClear();
  });

  describe('GET /api/search', () => {
    it('should perform a basic search with default parameters', async () => {
      mockEsSearch.mockResolvedValueOnce({
        hits: {
          total: { value: 0, relation: 'eq' },
          hits: [],
        },
      });

      const res = await request(app).get('/api/search?q=testquery');

      expect(res.status).toBe(200);
      expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
        index: 'persons,events,comments', // Default indices
        body: expect.objectContaining({
          query: {
            bool: {
              must: [expect.objectContaining({
                multi_match: expect.objectContaining({ query: 'testquery' })
              })],
              filter: [] // No filters by default
            }
          },
          from: 0,
          size: 10, // Default limit
          sort: expect.arrayContaining([{ _score: { order: 'desc' } }]), // Default sort
        }),
      }));
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.total).toBe(0);
    });

    it('should search with type filter "event"', async () => {
      mockEsSearch.mockResolvedValueOnce({ hits: { total: { value: 0 }, hits: [] } });
      await request(app).get('/api/search?q=test&type=event');

      expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
        index: 'events', // Correct index for 'event' type
        body: expect.objectContaining({
          query: expect.objectContaining({
            bool: expect.objectContaining({
              must: [expect.objectContaining({
                multi_match: expect.objectContaining({
                    fields: expect.arrayContaining(["title^3", "plainTextContent"]) // Event specific fields
                })
              })]
            })
          })
        })
      }));
    });

    it('should handle pagination parameters', async () => {
        mockEsSearch.mockResolvedValueOnce({ hits: { total: { value: 0 }, hits: [] } });
        await request(app).get('/api/search?q=test&page=3&limit=15');

        expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
          body: expect.objectContaining({
            from: 30, // (3 - 1) * 15
            size: 15,
          })
        }));
    });

    it('should handle sorting by date ascending', async () => {
        mockEsSearch.mockResolvedValueOnce({ hits: { total: { value: 0 }, hits: [] } });
        await request(app).get('/api/search?q=test&sortBy=date&sortOrder=asc');

        expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
          body: expect.objectContaining({
            sort: expect.arrayContaining([{ createdAt: { order: 'asc', unmapped_type: "date" } }]),
          })
        }));
    });

    it('should apply an advanced filter (e.g., category for events)', async () => {
        mockEsSearch.mockResolvedValueOnce({ hits: { total: { value: 0 }, hits: [] } });
        await request(app).get('/api/search?q=test&type=event&category=Birth');

        expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
            index: 'events',
            body: expect.objectContaining({
                query: expect.objectContaining({
                    bool: expect.objectContaining({
                        filter: expect.arrayContaining([
                            { term: { "category.keyword": "Birth" } }
                        ])
                    })
                })
            })
        }));
    });

    it('should request highlighting and pass it through', async () => {
        const mockHit = { _id: 'event1', _score: 1, _index: 'events', _source: { title: 'Test Event' }, highlight: { title: ['<mark>Test</mark> Event'] } };
        mockEsSearch.mockResolvedValueOnce({
            hits: {
                total: { value: 1, relation: 'eq' },
                hits: [mockHit],
            },
        });

        const res = await request(app).get('/api/search?q=Test');
        expect(res.status).toBe(200);
        expect(mockEsSearch).toHaveBeenCalledWith(expect.objectContaining({
            body: expect.objectContaining({
                highlight: expect.objectContaining({
                    pre_tags: ["<mark>"],
                    post_tags: ["</mark>"],
                    fields: expect.any(Object) // Check that some fields are configured for highlight
                })
            })
        }));
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0]).toHaveProperty('highlight');
        expect(res.body.data[0].highlight.title[0]).toBe('<mark>Test</mark> Event');
    });

    it('should return 400 for missing query parameter "q"', async () => {
        const res = await request(app).get('/api/search');
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({ msg: 'Search query (q) is required.' })
        ]));
    });
     it('should return 400 for too short query parameter "q"', async () => {
        const res = await request(app).get('/api/search?q=t');
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({ msg: 'Search query must be at least 2 characters long.' })
        ]));
    });
  });

  describe('POST /api/index', () => {
    it('should successfully index an event document', async () => {
      mockEsIndex.mockResolvedValueOnce({ result: 'created' }); // Or 'updated'
      const eventDoc = { title: 'New Event', content: '<p>Details</p>', eventDate: new Date().toISOString() };

      const res = await request(app)
        .post('/api/index')
        .send({ type: 'event', documentId: 'event123', document: eventDoc });

      expect(res.status).toBe(200); // Or 201 based on your route's logic
      expect(res.body.message).toContain('indexed successfully');
      expect(mockEsIndex).toHaveBeenCalledWith(expect.objectContaining({
        index: 'events',
        id: 'event123',
        body: expect.objectContaining({
            title: 'New Event',
            plainTextContent: 'Details' // Verifies HTML stripping
        }),
      }));
    });

    it('should return 400 for missing "type" in request body', async () => {
        const res = await request(app)
            .post('/api/index')
            .send({ documentId: 'id1', document: { title: 'Test' } });
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({ msg: expect.stringContaining('Type must be one of:') })
        ]));
    });
     // TODO: Add more validation tests for documentId, document
  });

  // TODO: Add describe block for DELETE /api/index/:type/:id
});
