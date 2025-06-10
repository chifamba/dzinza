import express, { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator'; // Added query
import {
    searchAndIndexingService,
    SearchAndIndexingService,
    SearchParams,
    SearchableType,
    SortByType,
    SortOrderType
} from '../services/searchAndIndexingService'; // Updated import
import { logger } from '@shared/utils/logger';

const router = express.Router();

// Use the exported instance directly
const serviceInstance = searchAndIndexingService;


const validIndexTypes: SearchableType[] = ['person', 'event', 'comment'];
const validSortBy: SortByType[] = ['relevance', 'date', 'name'];
const validSortOrder: SortOrderType[] = ['asc', 'desc'];
const typeToIndexName = (type: SearchableType): string => {
    // This mapping should align with your actual index names
    if (type === 'person') return 'persons';
    if (type === 'event') return 'events';
    if (type === 'comment') return 'comments';
    // Should not happen if validation is correct, but as a safeguard:
    throw new Error(`Invalid type encountered in typeToIndexName: ${type}`);
};

// POST /api/index - Index or update a document
router.post(
  '/index',
  [
    body('type').isIn(validIndexTypes).withMessage(`Type must be one of: ${validIndexTypes.join(', ')}`),
    body('documentId').isString().notEmpty().withMessage('documentId is required.'),
    body('document').isObject().withMessage('document body is required and must be an object.'),
    // Add more specific validation for document fields based on type if needed
    // e.g., body('document.title').if(body('type').equals('event')).notEmpty()
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, documentId, document } = req.body;

    try {
      const indexName = typeToIndexName(type);
      let documentToIndex = { ...document };

      // If type is 'event' and document has HTML 'content', transform it
      if (type === 'event' && documentToIndex.content && typeof documentToIndex.content === 'string') {
        documentToIndex.plainTextContent = serviceInstance.stripHtml(documentToIndex.content);
        // Optionally remove original HTML content if not needed in ES, or keep it
        // delete documentToIndex.content;
      }

      // If type is 'person', create/update fullName
      if (type === 'person') {
        let fullName = '';
        if (documentToIndex.firstName) fullName += documentToIndex.firstName;
        if (documentToIndex.lastName) fullName += (fullName ? ' ' : '') + documentToIndex.lastName;
        if (fullName) documentToIndex.fullName = fullName.trim();
      }


      await serviceInstance.indexDocument({
        indexName,
        documentId,
        documentBody: documentToIndex,
      });

      // 200 if updated, 201 if newly created (ES client might give this info, but for simplicity)
      res.status(200).json({ message: `Document ${documentId} of type ${type} indexed successfully.` });
    } catch (error: any) {
      logger.error(`Error processing /api/index request for type ${type}, ID ${documentId}:`, error);
      if (error.message.startsWith('Invalid type specified')) {
          return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Failed to index document.', error: error.message });
    }
  }
);

// DELETE /api/index/:type/:id - Delete a document from the index
router.delete(
  '/index/:type/:id',
  [
    param('type').isIn(validIndexTypes).withMessage(`Type must be one of: ${validIndexTypes.join(', ')}`),
    param('id').isString().notEmpty().withMessage('Document ID is required.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, id } = req.params;

    try {
      const indexName = typeToIndexName(type);
      await serviceInstance.deleteDocument(indexName, id);
      res.status(200).json({ message: `Document ${id} of type ${type} deleted successfully from index.` });
      // Or res.status(204).send();
    } catch (error: any) {
      logger.error(`Error processing /api/index/:type/:id DELETE request for type ${type}, ID ${id}:`, error);
       if (error.message.startsWith('Invalid type specified')) {
          return res.status(400).json({ message: error.message });
      }
      // Check if it's the "document not found for deletion" case, which might be a 200/204 still
      if (error.message.includes('not found in') && error.message.includes('for deletion')) {
        return res.status(200).json({ message: `Document ${id} of type ${type} was not found in index, considered deleted.` });
      }
      res.status(500).json({ message: 'Failed to delete document from index.', error: error.message });
    }
  }
);

export default router;

// GET /api/search - Perform a search
router.get(
    '/search',
    [
        query('q').isString().notEmpty().withMessage('Search query (q) is required.').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters long.'),
        query('type').optional().isString().custom((value: string) => {
            const types = value.split(',').map(t => t.trim());
            const invalidTypes = types.filter(t => !validIndexTypes.includes(t as SearchableType));
            if (invalidTypes.length > 0) {
                throw new Error(`Invalid search type(s): ${invalidTypes.join(', ')}. Allowed types: ${validIndexTypes.join(', ')}`);
            }
            return true;
        }),
        query('page').optional().isInt({ min: 1 }).toInt().default(1),
        query('limit').optional().isInt({ min: 1, max: 50 }).toInt().default(10),
        query('sortBy').optional().isIn(validSortBy).withMessage(`SortBy must be one of: ${validSortBy.join(', ')}`).default('relevance'),
        query('sortOrder').optional().isIn(validSortOrder).withMessage(`SortOrder must be one of: ${validSortOrder.join(', ')}`).default('desc'),
        // New filter validations
        query('eventDateFrom').optional().isISO8601().withMessage('eventDateFrom must be a valid ISO8601 date.'),
        query('eventDateTo').optional().isISO8601().withMessage('eventDateTo must be a valid ISO8601 date.'),
        query('birthDateFrom').optional().isISO8601().withMessage('birthDateFrom must be a valid ISO8601 date.'),
        query('birthDateTo').optional().isISO8601().withMessage('birthDateTo must be a valid ISO8601 date.'),
        query('deathDateFrom').optional().isISO8601().withMessage('deathDateFrom must be a valid ISO8601 date.'),
        query('deathDateTo').optional().isISO8601().withMessage('deathDateTo must be a valid ISO8601 date.'),
        query('location').optional().isString().trim().escape(),
        query('tags').optional().isString().trim().escape(), // Will be split into array in handler
        query('category').optional().isString().trim().escape(),
    ],
    async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const {
            q,
            type, // Comma-separated string or undefined
            q,
            type, // Comma-separated string or undefined
            page,
            limit,
            sortBy,
            sortOrder,
            // New filters
            eventDateFrom,
            eventDateTo,
            birthDateFrom,
            birthDateTo,
            deathDateFrom,
            deathDateTo,
            location,
            tags, // Comma-separated string
            category,
        } = req.query as any; // Cast after validation

        const searchParams: SearchParams = {
            query: q,
            page,
            limit,
            sortBy,
            sortOrder,
            // Add validated filters
            eventDateFrom,
            eventDateTo,
            birthDateFrom,
            birthDateTo,
            deathDateFrom,
            deathDateTo,
            location,
            category,
        };

        if (type) {
            searchParams.types = type.split(',').map((t: string) => t.trim()) as SearchableType[];
        }
        if (tags) {
            searchParams.tags = tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag !== '');
        }

        try {
            const results = await serviceInstance.performSearch(searchParams);
            res.status(200).json(results);
        } catch (error: any) {
            logger.error(`Error processing /api/search request for query "${q}":`, error);
            res.status(500).json({ message: 'Failed to perform search.', error: error.message });
        }
    }
);
