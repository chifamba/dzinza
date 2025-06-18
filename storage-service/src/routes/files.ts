import express, { Request, Response, NextFunction } from "express";
import multer, { File as MulterFile } from "multer";
import { body, query, param, validationResult } from "express-validator";
import { fileTypeFromBuffer } from "file-type";
import mongoose, { FilterQuery } from "mongoose";
import { S3Service, UploadOptions } from "../services/s3";
import { ImageProcessor } from "../services/imageProcessor";
import { File, IFile } from "../models/File"; // Assuming IFile is exported
import { logger } from "@shared/utils/logger";
import { trace } from '@opentelemetry/api';
import type { Span, SpanStatusCode } from '@opentelemetry/api';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow most common file types for genealogy
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/tiff",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * @swagger
 * components:
 *   schemas:
 *     FileUpload:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         userId:
 *           type: string
 *         familyTreeId:
 *           type: string
 *         originalName:
 *           type: string
 *         filename:
 *           type: string
 *         s3Key:
 *           type: string
 *         url:
 *           type: string
 *         size:
 *           type: integer
 *         mimeType:
 *           type: string
 *         category:
 *           type: string
 *           enum: [photo, document, audio, video, other]
 *         privacy:
 *           type: string
 *           enum: [public, private, family]
 *         metadata:
 *           type: object
 *         thumbnails:
 *           type: array
 *           items:
 *             type: object
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         description:
 *           type: string
 *
 *     FileUploadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         data:
 *           oneOf:
 *             - $ref: '#/components/schemas/FileUpload'
 *             - type: array
 *               items:
 *                 $ref: '#/components/schemas/FileUpload'
 *         meta:
 *           type: object
 */

/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload one or more files
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               familyTreeId:
 *                 type: string
 *                 description: Associated family tree ID
 *               category:
 *                 type: string
 *                 enum: [photo, document, audio, video, other]
 *                 default: other
 *               privacy:
 *                 type: string
 *                 enum: [public, private, family]
 *                 default: private
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               description:
 *                 type: string
 *                 description: File description
 *               generateThumbnails:
 *                 type: boolean
 *                 default: true
 *                 description: Generate thumbnails for images
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUploadResponse'
 *       400:
 *         description: Invalid request or file validation failed
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 *       500:
 *         description: Internal server error
 */
router.post(
  "/upload",
  upload.array("files", 10),
  [
    body("familyTreeId").optional().isString().trim(),
    body("category")
      .optional()
      .isIn(["photo", "document", "audio", "video", "other"]),
    body("privacy").optional().isIn(["public", "private", "family"]),
    body("tags").optional().isString(),
    body("relatedPersons").optional().isString(),
    body("relatedEvents").optional().isString(),
    body("description").optional().isString().trim().isLength({ max: 1000 }),
    body("generateThumbnails").optional().isBoolean(),
  ],
  async (req: Request, res: Response, _next: NextFunction) => { // Renamed next to _next
    // Added next
    const tracer = trace.getTracer("storage-service-file-routes");
    const parentSpan = tracer.startSpan("files.upload.handler");
    try {
      parentSpan.setAttributes({
        "http.method": "POST",
        "http.route": "/upload",
        "files.count": (req.files as MulterFile[])?.length || 0,
        "user.id": req.user?.id,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        parentSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: "Validation failed",
        });
        parentSpan.end();
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const files = req.files as MulterFile[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          error: "No files provided",
        });
      }

      if (!req.user?.id) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const userId = req.user.id;
      const {
        familyTreeId,
        category = "other",
        privacy = "private",
        tags,
        relatedPersons,
        relatedEvents,
        description,
        generateThumbnails = true,
      } = req.body;

      const uploadedFiles = [];

      for (const file of files) {
        await tracer.startActiveSpan(
          `files.processAndUpload.${file.originalname}`,
          async (fileSpan: Span) => {
            try {
              fileSpan.setAttributes({
                "file.originalName": file.originalname,
                "file.size": file.size,
                "file.mimetype": file.mimetype,
              });

              // Validate file type
              const detectedType = await fileTypeFromBuffer(file.buffer);
              const actualMimeType = detectedType?.mime || file.mimetype;

              // Upload options
              const uploadOptions: UploadOptions = {
                userId,
                familyTreeId,
                category,
                privacy,
                metadata: {
                  originalName: file.originalname,
                  size: file.size.toString(),
                  uploadedBy: userId,
                  ...(description && { description }),
                },
              };

              // Upload to S3
              const s3Result = await S3Service.uploadFile(
                file.buffer,
                file.originalname,
                actualMimeType,
                uploadOptions
              );

              // Process images
              const thumbnails = [];
              let imageMetadata = {};
              if (actualMimeType.startsWith("image/") && generateThumbnails) {
                try {
                  const processed = await ImageProcessor.processImage(
                    file.buffer,
                    {
                      generateThumbnails: true,
                      optimizeForWeb: true,
                      extractMetadata: true,
                    }
                  );

                  imageMetadata = processed.original.metadata;

                  // Upload thumbnails
                  if (processed.thumbnails) {
                    for (const thumbnail of processed.thumbnails) {
                      const thumbResult = await S3Service.uploadFile(
                        thumbnail.buffer,
                        `${thumbnail.name}_${file.originalname}`,
                        "image/jpeg",
                        {
                          ...uploadOptions,
                          metadata: {
                            ...uploadOptions.metadata,
                            thumbnailOf: s3Result.key,
                          },
                        }
                      );

                      thumbnails.push({
                        size: thumbnail.name,
                        width: thumbnail.width,
                        height: thumbnail.height,
                        key: thumbResult.key,
                        url: thumbResult.url,
                      });
                    }
                  }
                } catch (imageError) {
                  logger.warn("Failed to process image:", imageError);
                  // Continue without thumbnails
                }
              }

              // Save to database
              const fileRecord = new File({
                userId,
                familyTreeId,
                originalName: file.originalname,
                filename: s3Result.key.split("/").pop(),
                s3Key: s3Result.key,
                url: s3Result.url,
                size: file.size,
                mimeType: actualMimeType,
                category,
                privacy,
                metadata: {
                  ...s3Result.metadata,
                  ...imageMetadata,
                },
                thumbnails,
                tags: tags
                  ? tags
                      .split(",")
                      .map((tag: string) => tag.trim())
                      .filter(Boolean)
                  : [],
                relatedPersons: relatedPersons
                  ? relatedPersons
                      .split(",")
                      .map((id: string) => id.trim())
                      .filter(Boolean)
                  : [],
                relatedEvents: relatedEvents
                  ? relatedEvents
                      .split(",")
                      .map((id: string) => id.trim())
                      .filter(Boolean)
                  : [],
                description,
              });

              await fileRecord.save();
              uploadedFiles.push(fileRecord);

              fileSpan.setAttribute("file.s3Key", s3Result.key);
              fileSpan.setStatus({ code: SpanStatusCode.OK });
              fileSpan.end();
            } catch (fileError) {
              const err = fileError as Error;
              logger.error(`Error uploading file ${file.originalname}:`, err);
              fileSpan.recordException(err);
              fileSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message,
              });
              fileSpan.end();
              // Continue with other files
            }
          }
        );
      }

      if (uploadedFiles.length === 0) {
        return res.status(500).json({
          error: "Failed to upload any files",
        });
      }

      res.status(201).json({
        success: true,
        data: uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles,
        meta: {
          totalFiles: uploadedFiles.length,
          totalSize: uploadedFiles.reduce((sum, file) => sum + file.size, 0),
        },
      });
    } catch (error) {
      logger.error("File upload error:", error);
      res.status(500).json({
        error: "Upload failed",
        message: "An error occurred while uploading files",
      });
      parentSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      parentSpan.end();
      // No next(error) here as response is already sent.
    } finally {
      // Ensure parent span is ended if not already (e.g. due to early return)
      if (!parentSpan.ended) {
        parentSpan.end();
      }
    }
  }
);

/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List user's files with filtering and pagination
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: familyTreeId
 *         schema:
 *           type: string
 *         description: Filter by family tree
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [photo, document, audio, video, other]
 *         description: Filter by category
 *       - in: query
 *         name: privacy
 *         schema:
 *           type: string
 *           enum: [public, private, family]
 *         description: Filter by privacy level
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in filename and description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [uploadedAt, originalName, size]
 *           default: uploadedAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of files
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
 *                     $ref: '#/components/schemas/FileUpload'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get(
  "/",
  [
    query("familyTreeId").optional().isString(),
    query("category")
      .optional()
      .isIn(["photo", "document", "audio", "video", "other"]),
    query("privacy").optional().isIn(["public", "private", "family"]),
    query("tags").optional().isString(),
    query("search").optional().isString().trim(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sortBy").optional().isIn(["uploadedAt", "originalName", "size"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
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

      if (!req.user?.id) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const userId = req.user.id;
      const {
        familyTreeId,
        category,
        privacy,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = "uploadedAt",
        sortOrder = "desc",
      } = req.query;

      // Build query
      const query: FilterQuery<IFile> = { userId };

      if (familyTreeId) query.familyTreeId = familyTreeId as string; // Ensure string type for FilterQuery
      if (category) query.category = category;
      if (privacy) query.privacy = privacy;
      if (tags) {
        const tagArray = (tags as string).split(",").map((tag) => tag.trim());
        query.tags = { $in: tagArray };
      }
      if (search) {
        query.$or = [
          { originalName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // Calculate pagination
      const skip = (Number(page) - 1) * Number(limit);

      // Build sort
      const sort: Record<string, 1 | -1> = {};
      sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

      // Execute query
      const [files, total] = await Promise.all([
        File.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
        File.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: files,
        meta: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      logger.error("Error listing files:", error);
      res.status(500).json({
        error: "Failed to list files",
        message: "An error occurred while retrieving files",
      });
    }
  }
);

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file details by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/FileUpload'
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const file = await File.findOne({
      _id: id,
      userId,
    });

    if (!file) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    res.json({
      success: true,
      data: file,
    });
  } catch (error) {
    logger.error("Error getting file:", error);
    res.status(500).json({
      error: "Failed to get file",
      message: "An error occurred while retrieving the file",
    });
  }
});

/**
 * @swagger
 * /api/files/{id}/download:
 *   get:
 *     summary: Download file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *       - in: query
 *         name: thumbnail
 *         schema:
 *           type: string
 *           enum: [thumb, small, medium, large]
 *         description: Download thumbnail instead of original
 *     responses:
 *       200:
 *         description: File download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/:id/download",
  [query("thumbnail").optional().isIn(["thumb", "small", "medium", "large"])],
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { thumbnail } = req.query;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const userId = req.user.id;

      const file = await File.findOne({
        _id: id,
        userId,
      });

      if (!file) {
        return res.status(404).json({
          error: "File not found",
        });
      }

      let s3Key = file.s3Key;

      // Use thumbnail if requested
      if (thumbnail && file.metadata?.thumbnails) {
        const thumbnailUrl =
          file.metadata.thumbnails[
            thumbnail as keyof typeof file.metadata.thumbnails
          ];
        if (thumbnailUrl) {
          // Extract S3 key from URL or use the URL directly
          s3Key = thumbnailUrl;
        }
      }

      // Generate presigned URL
      const downloadUrl = await S3Service.getPresignedUrl(s3Key, "get", {
        expiresIn: 3600, // 1 hour
        responseContentDisposition: `attachment; filename="${file.originalName}"`,
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      res.json({
        success: true,
        data: {
          downloadUrl,
          expiresAt,
        },
      });
    } catch (error) {
      logger.error("Error generating download URL:", error);
      res.status(500).json({
        error: "Failed to generate download URL",
        message: "An error occurred while generating the download URL",
      });
    }
  }
);

/**
 * @swagger
 * /api/files/{id}:
 *   put:
 *     summary: Update file metadata
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               privacy:
 *                 type: string
 *                 enum: [public, private, family]
 *               familyTreeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: File updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/:id",
  [
    body("description").optional().isString().trim().isLength({ max: 1000 }),
    body("tags").optional().isArray(),
    body("tags.*").optional().isString().trim(),
    body("privacy").optional().isIn(["public", "private", "family"]),
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

      const { id } = req.params;

      if (!req.user?.id) {
        return res.status(401).json({ error: "User authentication required" });
      }

      const userId = req.user.id;
      const updates = req.body;

      const file = await File.findOneAndUpdate(
        { _id: id, userId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!file) {
        return res.status(404).json({
          error: "File not found",
        });
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      logger.error("Error updating file:", error);
      res.status(500).json({
        error: "Failed to update file",
        message: "An error occurred while updating the file",
      });
    }
  }
);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete file by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const file = await File.findOne({
      _id: id,
      userId,
    });

    if (!file) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    // Delete from S3
    try {
      await S3Service.deleteFile(file.s3Key);

      // Delete thumbnails
      if (file.metadata?.thumbnails) {
        const thumbnails = file.metadata.thumbnails;
        for (const size of Object.keys(thumbnails)) {
          const thumbnailUrl = thumbnails[size as keyof typeof thumbnails];
          if (thumbnailUrl) {
            await S3Service.deleteFile(thumbnailUrl);
          }
        }
      }
    } catch (s3Error) {
      logger.error("Error deleting from S3:", s3Error);
      // Continue to delete from database even if S3 deletion fails
    }

    // Delete from database
    await File.deleteOne({ _id: id });

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting file:", error);
    res.status(500).json({
      error: "Failed to delete file",
      message: "An error occurred while deleting the file",
    });
  }
});

// --- Internal Event Association Endpoints ---

/**
 * @swagger
 * /api/files/{fileId}/associate-event:
 *   put:
 *     summary: Associate an event with a file (Internal)
 *     tags: [Files, Internal]
 *     description: Adds an event ID to the file's relatedEvents array. Intended for internal service-to-service communication.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the file
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: The ID of the event to associate
 *     responses:
 *       200:
 *         description: Event associated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUpload'
 *       400:
 *         description: Invalid input (fileId or eventId)
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 *     security: [] # No end-user auth, but should be protected by network policies/service auth
 */
router.put(
  "/:fileId/associate-event",
  [
    param("fileId").isMongoId().withMessage("Invalid file ID"),
    body("eventId").notEmpty().withMessage("Event ID is required").isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fileId } = req.params;
    const { eventId } = req.body;

    try {
      const updatedFile = await File.findByIdAndUpdate(
        fileId,
        { $addToSet: { relatedEvents: eventId } },
        { new: true }
      );

      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.status(200).json(updatedFile);
    } catch (error) {
      logger.error(
        `Error associating event ${eventId} with file ${fileId}:`,
        error
      );
      if (error instanceof mongoose.Error.CastError && error.path === "_id") {
        return res
          .status(400)
          .json({ message: "Invalid file ID format in request" });
      }
      res.status(500).json({ message: "Server error while associating event" });
    }
  }
);

/**
 * @swagger
 * /api/files/{fileId}/disassociate-event:
 *   put:
 *     summary: Disassociate an event from a file (Internal)
 *     tags: [Files, Internal]
 *     description: Removes an event ID from the file's relatedEvents array. Intended for internal service-to-service communication.
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: mongoId
 *         description: The ID of the file
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventId
 *             properties:
 *               eventId:
 *                 type: string
 *                 description: The ID of the event to disassociate
 *     responses:
 *       200:
 *         description: Event disassociated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileUpload'
 *       400:
 *         description: Invalid input (fileId or eventId)
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 *     security: [] # No end-user auth, but should be protected by network policies/service auth
 */
router.put(
  "/:fileId/disassociate-event",
  [
    param("fileId").isMongoId().withMessage("Invalid file ID"),
    body("eventId").notEmpty().withMessage("Event ID is required").isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fileId } = req.params;
    const { eventId } = req.body;

    try {
      const updatedFile = await File.findByIdAndUpdate(
        fileId,
        { $pull: { relatedEvents: eventId } },
        { new: true }
      );

      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      res.status(200).json(updatedFile);
    } catch (error) {
      logger.error(
        `Error disassociating event ${eventId} from file ${fileId}:`,
        error
      );
      if (error instanceof mongoose.Error.CastError && error.path === "_id") {
        return res
          .status(400)
          .json({ message: "Invalid file ID format in request" });
      }
      res
        .status(500)
        .json({ message: "Server error while disassociating event" });
    }
  }
);

export default router;
