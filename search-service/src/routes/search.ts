import express, { Request, Response, NextFunction } from "express"; // Added NextFunction
import { trace, SpanStatusCode, Span } from '@opentelemetry/api'; // Import OpenTelemetry API, removed Attributes
import { body, query, validationResult } from "express-validator";
import {
  ElasticsearchService,
  SearchQuery,
  PersonSearchParams,
} from "../services/elasticsearch";
import { logger } from "../utils/logger";
import "../types/express"; // This might already define AuthenticatedRequest globally

// Define a type for the user payload if not globally available via ../types/express
interface UserPayload {
  id: string;
  // Add other relevant user fields if needed by this route
}

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SearchQuery:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Text query to search for
 *           example: "John Smith"
 *         type:
 *           type: array
 *           items:
 *             type: string
 *             enum: [person, record, document, location]
 *           description: Types of documents to search
 *         privacy:
 *           type: array
 *           items:
 *             type: string
 *             enum: [public, private, family]
 *           description: Privacy levels to include
 *         familyTreeId:
 *           type: string
 *           description: Filter by specific family tree
 *         dateRange:
 *           type: object
 *           properties:
 *             field:
 *               type: string
 *               example: "metadata.birthDate"
 *             from:
 *               type: string
 *               format: date
 *             to:
 *               type: string
 *               format: date
 *         location:
 *           type: object
 *           properties:
 *             field:
 *               type: string
 *               example: "location"
 *             value:
 *               type: string
 *               example: "40.7128,-74.0060"
 *             radius:
 *               type: string
 *               example: "50km"
 *         sort:
 *           type: object
 *           properties:
 *             field:
 *               type: string
 *               example: "updated"
 *             order:
 *               type: string
 *               enum: [asc, desc]
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         size:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *
 *     SearchResult:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of matching documents
 *         hits:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               score:
 *                 type: number
 *               source:
 *                 $ref: '#/components/schemas/SearchDocument'
 *               highlight:
 *                 type: object
 *         aggregations:
 *           type: object
 *         suggestions:
 *           type: array
 *           items:
 *             type: string
 *
 *     SearchDocument:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [person, record, document, location]
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         metadata:
 *           type: object
 *         userId:
 *           type: string
 *         familyTreeId:
 *           type: string
 *         privacy:
 *           type: string
 *           enum: [public, private, family]
 *         created:
 *           type: string
 *           format: date-time
 *         updated:
 *           type: string
 *           format: date-time
 *
 *     PersonSearchParams:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         birthDate:
 *           type: string
 *           format: date
 *         birthPlace:
 *           type: string
 *         deathDate:
 *           type: string
 *           format: date
 *         deathPlace:
 *           type: string
 *         fuzzyMatch:
 *           type: boolean
 *           default: true
 *         familyTreeId:
 *           type: string
 */

/**
 * @swagger
 * /api/search:
 *   post:
 *     summary: General search across all document types
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchQuery'
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  [
    body("query").optional().isString().trim().isLength({ min: 1, max: 1000 }),
    body("type").optional().isArray(),
    body("type.*")
      .optional()
      .isIn(["person", "record", "document", "location"]),
    body("privacy").optional().isArray(),
    body("privacy.*").optional().isIn(["public", "private", "family"]),
    body("familyTreeId").optional().isString().trim(),
    body("page").optional().isInt({ min: 1 }),
    body("size").optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response, _next: NextFunction) => { // Renamed next to _next
    const tracer = trace.getTracer('search-service-routes');
    await tracer.startActiveSpan('search.general.handler', async (span: Span) => {
      try {
        span.setAttributes({
          'http.method': 'POST',
          'http.route': '/',
          'search.query': req.body.query,
          'search.types': req.body.type?.join(','),
          'user.id': (req as AuthenticatedRequest).user?.id,
        });

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Validation failed' });
          span.end();
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const userFromAuth = (req as AuthenticatedRequest).user;
      if (!userFromAuth) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const userId = userFromAuth.id; // userFromAuth is guaranteed non-null here
      const searchQuery: SearchQuery = {
        ...req.body,
        userId, // Always filter by current user
      };

      // Log search for analytics
      await ElasticsearchService.logSearch({
        userId,
        sessionId: req.sessionID || "unknown",
        query: searchQuery.query || "",
        type: "general",
        filters: {
          type: searchQuery.type,
          privacy: searchQuery.privacy,
          familyTreeId: searchQuery.familyTreeId,
        },
      });

      const result = await tracer.startActiveSpan('elasticsearch.search', async (esSpan: Span) => {
        try {
          esSpan.setAttributes({
            'db.system': 'elasticsearch',
            'db.statement': JSON.stringify(searchQuery) // Or a more concise representation
          });
          const searchResult = await ElasticsearchService.search(searchQuery);
          esSpan.setStatus({ code: SpanStatusCode.OK });
          esSpan.end();
          return searchResult;
        } catch (dbError) {
          const dbe = dbError as Error;
          esSpan.recordException(dbe);
          esSpan.setStatus({ code: SpanStatusCode.ERROR, message: dbe.message });
          esSpan.end();
          throw dbe;
        }
      });

      res.json({
        success: true,
        data: result,
        meta: {
          query: searchQuery.query,
          page: searchQuery.page || 1,
          size: searchQuery.size || 20,
        },
      });
    } catch (error) {
      logger.error("Search error:", error);
      res.status(500).json({ // Added res.status(500).json()
        error: "Search failed",
        message: "An error occurred while searching",
      });
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      span.end();
      // No next(error) here as response is sent.
    } finally {
      if (!span.ended) { // Ensure parent span is always ended
        span.end();
      }
    }
  });
});

/**
 * @swagger
 * /api/search/person:
 *   post:
 *     summary: Search for people with genealogy-specific matching
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PersonSearchParams'
 *     responses:
 *       200:
 *         description: Person search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SearchResult'
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/person",
  [
    body("firstName")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 }),
    body("lastName")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 }),
    body("birthDate").optional().isISO8601(),
    body("birthPlace")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 }),
    body("deathDate").optional().isISO8601(),
    body("deathPlace")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 }),
    body("fuzzyMatch").optional().isBoolean(),
    body("familyTreeId").optional().isString().trim(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const userFromAuthForPersonSearch = (req as AuthenticatedRequest).user;
      if (!userFromAuthForPersonSearch) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const userId = userFromAuthForPersonSearch.id; // userFromAuthForPersonSearch is guaranteed non-null here
      const searchParams: PersonSearchParams = req.body;

      // Log search for analytics
      await ElasticsearchService.logSearch({
        userId,
        sessionId: req.sessionID || "unknown",
        query: `${searchParams.firstName || ""} ${
          searchParams.lastName || ""
        }`.trim(),
        type: "person",
        filters: searchParams,
      });

      const result = await ElasticsearchService.searchPerson(
        searchParams,
        userId
      );

      res.json({
        success: true,
        data: result,
        meta: {
          searchParams,
          fuzzyMatch: searchParams.fuzzyMatch !== false,
        },
      });
    } catch (error) {
      logger.error("Person search error:", error);
      res.status(500).json({
        error: "Person search failed",
        message: "An error occurred while searching for people",
      });
    }
  }
);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions based on partial query
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Partial query for suggestions
 *     responses:
 *       200:
 *         description: Search suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid query parameter
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/suggestions",
  [query("q").isString().trim().isLength({ min: 2, max: 100 })],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const query = req.query.q as string;
      const suggestions = await ElasticsearchService.getSuggestions(query);

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      logger.error("Suggestions error:", error);
      res.status(500).json({
        error: "Suggestions failed",
        message: "An error occurred while getting suggestions",
      });
    }
  }
);

/**
 * @swagger
 * /api/search/index:
 *   post:
 *     summary: Index a document for search
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchDocument'
 *     responses:
 *       201:
 *         description: Document indexed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/index",
  [
    body("id").isString().trim().notEmpty(),
    body("type").isIn(["person", "record", "document", "location"]),
    body("title").isString().trim().isLength({ min: 1, max: 500 }),
    body("content").isString().trim(),
    body("metadata").isObject(),
    body("privacy").isIn(["public", "private", "family"]),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const userFromAuthForIndex = (req as AuthenticatedRequest).user;
      if (!userFromAuthForIndex) {
        return res.status(401).json({ error: "User authentication required" });
      }
      const userId = userFromAuthForIndex.id; // userFromAuthForIndex is guaranteed non-null here
      const document = {
        ...req.body,
        userId,
        created: new Date(),
        updated: new Date(),
      };

      await ElasticsearchService.indexDocument(document);

      res.status(201).json({
        success: true,
        message: "Document indexed successfully",
      });
    } catch (error) {
      logger.error("Indexing error:", error);
      res.status(500).json({
        error: "Indexing failed",
        message: "An error occurred while indexing the document",
      });
    }
  }
);

/**
 * @swagger
 * /api/search/index/{id}:
 *   put:
 *     summary: Update an indexed document
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               metadata:
 *                 type: object
 *               privacy:
 *                 type: string
 *                 enum: [public, private, family]
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Invalid update data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/index/:id",
  [
    body("title").optional().isString().trim().isLength({ min: 1, max: 500 }),
    body("content").optional().isString().trim(),
    body("metadata").optional().isObject(),
    body("privacy").optional().isIn(["public", "private", "family"]),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Document ID is required" });
      }

      const updates = {
        ...req.body,
        updated: new Date(),
      };

      await ElasticsearchService.updateDocument(id, updates);

      res.json({
        success: true,
        message: "Document updated successfully",
      });
    } catch (error) {
      logger.error("Update error:", error);
      res.status(500).json({
        error: "Update failed",
        message: "An error occurred while updating the document",
      });
    }
  }
);

/**
 * @swagger
 * /api/search/index/{id}:
 *   delete:
 *     summary: Remove a document from search index
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID to remove
 *     responses:
 *       200:
 *         description: Document removed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 */
router.delete("/index/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    await ElasticsearchService.deleteDocument(id);

    res.json({
      success: true,
      message: "Document removed from index successfully",
    });
  } catch (error) {
    logger.error("Delete error:", error);
    res.status(500).json({
      error: "Delete failed",
      message: "An error occurred while removing the document",
    });
  }
});

export default router;
