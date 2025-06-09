import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { Event, IEvent } from '../models'; // Assuming index.ts in models exports Event and IEvent
import { authMiddleware } from '@shared/middleware/auth'; // Path to shared auth middleware
import { logger } from '@shared/utils/logger'; // Path to shared logger

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - content
 *         - userId
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated id of the event
 *         userId:
 *           type: string
 *           description: The ID of the user who created the event
 *         familyTreeId:
 *           type: string
 *           description: The ID of the associated family tree (optional)
 *         title:
 *           type: string
 *           description: The title of the event
 *         content:
 *           type: string
 *           description: The content of the event (e.g., HTML or JSON for Delta)
 *         date:
 *           type: string
 *           format: date-time
 *           description: The date of the event (optional)
 *         endDate:
 *           type: string
 *           format: date-time
 *           description: The end date for events spanning a period (optional)
 *         place:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             address:
 *               type: string
 *           description: Location of the event (optional)
 *         relatedPersons:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of persons involved in the event (optional)
 *         associatedMediaIds:
 *           type: array
 *           items:
 *             type: string
 *           description: IDs of media items linked to the event (optional)
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags for the event (optional)
 *         category:
 *           type: string
 *           description: Category of the event (e.g., "Birth", "Marriage") (optional)
 *         privacy:
 *           type: string
 *           enum: [public, private, family]
 *           default: private
 *           description: Privacy setting for the event
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the event was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the event was last updated
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event' # Reference the Event schema
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authMiddleware,
  [
    body('title').notEmpty().withMessage('Title is required').trim(),
    body('content').notEmpty().withMessage('Content is required').trim(), // Consider custom sanitizer if content is HTML/JSON
    body('date').optional().isISO8601().toDate(),
    body('endDate').optional().isISO8601().toDate(),
    body('place.name').optional({ checkFalsy: true }).isString().trim(),
    body('place.latitude').optional({ checkFalsy: true }).isNumeric(),
    body('place.longitude').optional({ checkFalsy: true }).isNumeric(),
    body('place.address').optional({ checkFalsy: true }).isString().trim(),
    body('familyTreeId').optional({ checkFalsy: true }).isString().trim(),
    body('relatedPersons').optional().isArray().withMessage('relatedPersons must be an array'),
    body('relatedPersons.*').optional({ checkFalsy: true }).isString().trim(),
    body('associatedMediaIds').optional().isArray().withMessage('associatedMediaIds must be an array'),
    body('associatedMediaIds.*').optional({ checkFalsy: true }).isString().trim(),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional({ checkFalsy: true }).isString().trim(),
    body('category').optional({ checkFalsy: true }).isString().trim(),
    body('privacy').optional().isIn(['public', 'private', 'family']).withMessage('Invalid privacy value'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated correctly' });
    }

    const {
      title,
      content,
      date,
      endDate,
      place,
      familyTreeId,
      relatedPersons,
      associatedMediaIds,
      tags,
      category,
      privacy,
    } = req.body;

    try {
      const newEvent = new Event({
        userId: req.user.id,
        title,
        content,
        date,
        endDate,
        place,
        familyTreeId,
        relatedPersons: relatedPersons || [],
        associatedMediaIds: associatedMediaIds || [],
        tags: tags || [],
        category,
        privacy: privacy || 'private',
      });

      await newEvent.save();

      // Associate media files if any are provided
      if (newEvent.associatedMediaIds && newEvent.associatedMediaIds.length > 0) {
        const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:80'; // Placeholder

        for (const mediaId of newEvent.associatedMediaIds) {
          try {
            const response = await fetch(`${STORAGE_SERVICE_URL}/api/files/${mediaId}/associate-event`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                // TODO: Add internal service-to-service authentication header if required
              },
              body: JSON.stringify({ eventId: newEvent._id.toString() }),
            });

            if (!response.ok) {
              const errorBody = await response.text();
              logger.warn(`Failed to associate media ${mediaId} with event ${newEvent._id}. Status: ${response.status}. Body: ${errorBody}`);
            } else {
              logger.info(`Successfully associated media ${mediaId} with event ${newEvent._id}`);
            }
          } catch (fetchError) {
            logger.error(`Error calling storage service to associate media ${mediaId} with event ${newEvent._id}:`, fetchError);
          }
        }
      }
      // The main event creation is successful even if media association fails for some items.

      res.status(201).json(newEvent);
    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({ message: 'Server error while creating event' });
    }
  }
);

// Swagger documentation for PUT /api/events/{id} (Update Event)
/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update an existing event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the event to update
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
 *               date:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               place:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               familyTreeId:
 *                 type: string
 *               relatedPersons:
 *                 type: array
 *                 items:
 *                   type: string
 *               associatedMediaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *               privacy:
 *                 type: string
 *                 enum: [public, private, family]
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid input or event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (user is not the owner of the event)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.put(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
    body('title').optional().notEmpty().withMessage('Title cannot be empty').trim(),
    body('content').optional().notEmpty().withMessage('Content cannot be empty').trim(),
    body('date').optional({nullable: true}).isISO8601().toDate(),
    body('endDate').optional({nullable: true}).isISO8601().toDate(),
    body('place.name').optional({ checkFalsy: true }).isString().trim(),
    body('place.latitude').optional({ checkFalsy: true }).isNumeric(),
    body('place.longitude').optional({ checkFalsy: true }).isNumeric(),
    body('place.address').optional({ checkFalsy: true }).isString().trim(),
    body('familyTreeId').optional({ checkFalsy: true }).isString().trim(), // Allow unsetting by passing null/empty
    body('relatedPersons').optional().isArray().withMessage('relatedPersons must be an array'),
    body('relatedPersons.*').optional({ checkFalsy: true }).isString().trim(),
    body('associatedMediaIds').optional().isArray().withMessage('associatedMediaIds must be an array'),
    body('associatedMediaIds.*').optional({ checkFalsy: true }).isString().trim(),
    body('tags').optional().isArray().withMessage('tags must be an array'),
    body('tags.*').optional({ checkFalsy: true }).isString().trim(),
    body('category').optional({ checkFalsy: true }).isString().trim(),
    body('privacy').optional().isIn(['public', 'private', 'family']).withMessage('Invalid privacy value'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated correctly' });
    }

    const { id } = req.params;
    const updates = req.body;

    try {
      const event = await Event.findById(id);

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (event.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'User not authorized to update this event' });
      }

      // Update fields that are provided in the request body
      Object.keys(updates).forEach(key => {
        if (key === 'place' && typeof updates.place === 'object' && updates.place !== null) {
            event.place = { ...event.place, ...updates.place };
        } else if (updates[key] !== undefined) {
          (event as any)[key] = updates[key];
        } else if (updates[key] === null) { // Allow unsetting optional fields by passing null
          if (['date', 'endDate', 'familyTreeId', 'category', 'place'].includes(key)) {
            (event as any)[key] = undefined;
          }
        }
      });

      const originalMediaIds = [...event.associatedMediaIds]; // Shallow copy before updates are applied

      // Update fields that are provided in the request body
      Object.keys(updates).forEach(key => {
        if (key === 'place' && typeof updates.place === 'object' && updates.place !== null) {
            event.place = { ...event.place, ...updates.place };
        } else if (updates[key] !== undefined) {
          (event as any)[key] = updates[key];
        } else if (updates[key] === null) { // Allow unsetting optional fields by passing null
          if (['date', 'endDate', 'familyTreeId', 'category', 'place'].includes(key)) {
            (event as any)[key] = undefined;
          }
        }
      });

      // Ensure arrays are not accidentally set to null if body provides them as null explicitly (instead of empty array)
      if (updates.relatedPersons === null) event.relatedPersons = [];
      // If associatedMediaIds is explicitly passed as null, treat it as an intention to clear it.
      // If associatedMediaIds is not in updates, it remains unchanged by the Object.keys loop.
      if (updates.associatedMediaIds === null) event.associatedMediaIds = [];
      else if (updates.associatedMediaIds !== undefined) event.associatedMediaIds = updates.associatedMediaIds;


      if (updates.tags === null) event.tags = [];


      const updatedEvent = await event.save();
      const newMediaIds = updatedEvent.associatedMediaIds || [];
      const eventIdStr = updatedEvent._id.toString();

      const addedMediaIds = newMediaIds.filter(id => !originalMediaIds.includes(id));
      const removedMediaIds = originalMediaIds.filter(id => !newMediaIds.includes(id));

      const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:80';

      // Process added media associations
      for (const mediaId of addedMediaIds) {
        try {
          const response = await fetch(`${STORAGE_SERVICE_URL}/api/files/${mediaId}/associate-event`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' /* TODO: Service-to-service auth */ },
            body: JSON.stringify({ eventId: eventIdStr }),
          });
          if (!response.ok) {
            logger.warn(`Failed to associate new media ${mediaId} with event ${eventIdStr}. Status: ${response.status}`);
          } else {
            logger.info(`Successfully associated new media ${mediaId} with event ${eventIdStr}`);
          }
        } catch (fetchError) {
          logger.error(`Error calling storage service for new media association (event ${eventIdStr}, media ${mediaId}):`, fetchError);
        }
      }

      // Process removed media associations
      for (const mediaId of removedMediaIds) {
        try {
          const response = await fetch(`${STORAGE_SERVICE_URL}/api/files/${mediaId}/disassociate-event`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' /* TODO: Service-to-service auth */ },
            body: JSON.stringify({ eventId: eventIdStr }),
          });
          if (!response.ok) {
            logger.warn(`Failed to disassociate old media ${mediaId} from event ${eventIdStr}. Status: ${response.status}`);
          } else {
            logger.info(`Successfully disassociated old media ${mediaId} from event ${eventIdStr}`);
          }
        } catch (fetchError) {
          logger.error(`Error calling storage service for old media disassociation (event ${eventIdStr}, media ${mediaId}):`, fetchError);
        }
      }

      res.status(200).json(updatedEvent);
    } catch (error) {
      logger.error(`Error updating event ${id}:`, error);
      if (error instanceof mongoose.Error.CastError) {
          return res.status(400).json({ message: 'Invalid event ID format' });
      }
      res.status(500).json({ message: 'Server error while updating event' });
    }
  }
);

// Swagger documentation for DELETE /api/events/{id} (Delete Event)
/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete an event by its ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the event to delete
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       204:
 *         description: Event deleted successfully (No Content) - Alternate response
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (user is not the owner of the event)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated correctly' });
    }

    const { id } = req.params;

    try {
      const event = await Event.findById(id);

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      if (event.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: 'User not authorized to delete this event' });
      }

      // Disassociate media files before deleting the event
      if (event.associatedMediaIds && event.associatedMediaIds.length > 0) {
        const STORAGE_SERVICE_URL = process.env.STORAGE_SERVICE_URL || 'http://storage-service:80'; // Placeholder
        const eventIdStr = event._id.toString();

        for (const mediaId of event.associatedMediaIds) {
          try {
            const response = await fetch(`${STORAGE_SERVICE_URL}/api/files/${mediaId}/disassociate-event`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                // TODO: Add internal service-to-service authentication header if required
              },
              body: JSON.stringify({ eventId: eventIdStr }),
            });

            if (!response.ok) {
              const errorBody = await response.text();
              logger.warn(`Failed to disassociate media ${mediaId} from event ${eventIdStr} during event deletion. Status: ${response.status}. Body: ${errorBody}`);
            } else {
              logger.info(`Successfully disassociated media ${mediaId} from event ${eventIdStr} during event deletion.`);
            }
          } catch (fetchError) {
            logger.error(`Error calling storage service to disassociate media ${mediaId} from event ${eventIdStr} during event deletion:`, fetchError);
          }
        }
      }

      await Event.findByIdAndDelete(id);

      res.status(200).json({ message: 'Event deleted successfully' });
      // Alternatively, use 204 No Content:
      // res.status(204).send();

    } catch (error) {
      logger.error(`Error deleting event ${id}:`, error);
       if (error instanceof mongoose.Error.CastError) {
          return res.status(400).json({ message: 'Invalid event ID format' });
      }
      res.status(500).json({ message: 'Server error while deleting event' });
    }
  }
);

// Swagger documentation for GET /api/events (List Events)
/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List events with filtering, pagination, and sorting
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of events per page
 *       - in: query
 *         name: familyTreeId
 *         schema:
 *           type: string
 *         description: Filter by family tree ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID (creator of the event)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by event category
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: relatedPersonId
 *         schema:
 *           type: string
 *         description: Filter events related to a specific person ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [date, createdAt, title]
 *           default: date
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: A list of events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Event'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
    query('familyTreeId').optional().isString().trim(),
    query('userId').optional().isString().trim(),
    query('category').optional().isString().trim(),
    query('tags').optional().isString().trim(),
    query('relatedPersonId').optional().isString().trim(),
    query('sortBy').optional().isIn(['date', 'createdAt', 'title']).withMessage('Invalid sortBy value').default('date'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sortOrder value').default('desc'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated correctly' });
    }

    const {
      page,
      limit,
      familyTreeId,
      userId: queryUserId, // Renamed to avoid conflict with req.user.id
      category,
      tags,
      relatedPersonId,
      sortBy,
      sortOrder,
    } = req.query as any; // Cast to any to handle parsed query params by express-validator

    try {
      const queryFilter: any = {};

      // Default to user's own events unless a specific userId is queried for public/admin scenarios
      // More complex logic would be needed for 'family' privacy across different users.
      if (queryUserId && queryUserId === req.user.id) {
        queryFilter.userId = req.user.id;
      } else if (queryUserId) {
        // If querying for another user's events, only allow if those events are public.
        queryFilter.userId = queryUserId;
        queryFilter.privacy = 'public';
      } else {
        // Default: User's own events + public events they might be related to or from their tree.
        // This part can be complex. For now, let's simplify:
        // Show user's own events, or if familyTreeId is specified, show events from that tree
        // that are not private (public or family).
        queryFilter.userId = req.user.id; // Start with user's own.
        // A more advanced query might use $or to include other relevant events.
      }


      if (familyTreeId) queryFilter.familyTreeId = familyTreeId;
      if (category) queryFilter.category = category;

      if (tags) {
        const tagArray = (tags as string).split(',').map(tag => tag.trim()).filter(Boolean);
        if (tagArray.length > 0) queryFilter.tags = { $in: tagArray };
      }

      if (relatedPersonId) {
        queryFilter.relatedPersons = relatedPersonId; // Check if array contains this ID
      }

      // Adjust privacy for requests not targeting the logged-in user's direct items
      // If queryUserId is set and is different from logged-in user, we've already set privacy to 'public'.
      // If no queryUserId, and user is just browsing (e.g. by familyTreeId not their own),
      // they should only see 'public' or 'family' events.
      // This is a simplification; true family privacy needs to check tree membership.
      if (!queryUserId && familyTreeId) {
         // If querying a specific family tree (potentially not owned by user), filter out private events.
        queryFilter.$or = [
            { userId: req.user.id }, // Their own events in that tree
            { familyTreeId: familyTreeId, privacy: { $in: ['public', 'family'] } } // Public/Family events in that tree
        ];
        if (queryFilter.userId && queryFilter.familyTreeId) { // Avoid redundant userId if already specific
             delete queryFilter.userId; // The $or handles user-specific and tree-specific
        }
      } else if (!queryUserId && !familyTreeId) { // General query, not specific tree or user
        // Show user's own events OR public events.
         queryFilter.$or = [
            { userId: req.user.id },
            { privacy: 'public' }
        ];
      }


      const sortOptions: any = {};
      if (sortBy) sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      const totalEvents = await Event.countDocuments(queryFilter);
      const events = await Event.find(queryFilter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(); // Use .lean() for performance if not modifying docs

      res.status(200).json({
        data: events,
        pagination: {
          total: totalEvents,
          page,
          limit,
          totalPages: Math.ceil(totalEvents / limit),
        },
      });
    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ message: 'Server error while fetching events' });
    }
  }
);

// Swagger documentation for GET /api/events/{id} (Get Event by ID)
/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get a specific event by its ID
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the event to retrieve
 *     responses:
 *       200:
 *         description: The requested event
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Event'
 *       400:
 *         description: Invalid event ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (user does not have access to this event)
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  authMiddleware,
  [
    param('id').isMongoId().withMessage('Invalid event ID'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated correctly' });
    }

    const { id } = req.params;

    try {
      const event = await Event.findById(id);

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }

      // Access Control
      const isOwner = event.userId.toString() === req.user.id;
      const isPublic = event.privacy === 'public';
      // Simplified 'family' privacy: for now, treat as public if not owner.
      // A real implementation would check if the req.user.id is part of the event's familyTreeId's members.
      const isFamilyViewable = event.privacy === 'family';


      if (isOwner || isPublic || isFamilyViewable) {
        res.status(200).json(event);
      } else {
        // If not owner and privacy is 'private' (or 'family' without further checks)
        return res.status(403).json({ message: 'Access forbidden to this event' });
      }

    } catch (error) {
      logger.error(`Error fetching event ${id}:`, error);
      if (error instanceof mongoose.Error.CastError) { // Mongoose specific error for bad ID format before param validation
          return res.status(400).json({ message: 'Invalid event ID format' });
      }
      res.status(500).json({ message: 'Server error while fetching event' });
    }
  }
);

export default router;
