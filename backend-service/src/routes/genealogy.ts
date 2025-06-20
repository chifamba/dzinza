// backend-service/src/routes/genealogy.ts
import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { database } from "../config/database";
import { logger } from "../shared/utils/logger";

const router = Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret-key";

// Auth helper function
interface JWTPayload {
  userId: string;
  email: string;
}

const authenticate = async (
  req: Request
): Promise<{ userId: string; email: string } | null> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;

    if (!decoded.userId) {
      return null;
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch (error) {
    return null;
  }
};

// Test route without auth middleware first
router.get("/test", async (req: Request, res: Response) => {
  res.json({ message: "Genealogy service is working" });
});

// Interfaces for genealogy data
interface FamilyMember {
  id: string;
  name: string; // Computed full name
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  birthDate?: string;
  deathDate?: string;
  profileImageUrl?: string;
  parentIds?: string[];
  childIds?: string[];
  spouseIds?: string[];
  treeId: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Relationship {
  id: string;
  type: "SPOUSE" | "PARENT_CHILD" | "SIBLING";
  person1Id: string;
  person2Id: string;
  treeId: string;
  userId: string;
  createdAt?: string;
}

interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  members: FamilyMember[];
  relationships: Relationship[];
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

// Extend Request to include user
// interface AuthenticatedRequest extends Request {
//   user?: {
//     id: string;
//     email: string;
//   };
// }

/**
 * @swagger
 * /api/genealogy/family-tree:
 *   get:
 *     summary: Get user's family tree
 *     tags: [Genealogy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Family tree data
 *       401:
 *         description: Unauthorized
 */
router.get("/family-tree", async (req: Request, res: Response) => {
  try {
    // Auth check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication Failed",
        message: "Authorization header is required",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;

    if (!decoded.userId) {
      return res.status(401).json({
        error: "Authentication Failed",
        message: "Invalid token",
      });
    }

    const userId = decoded.userId;

    // Get or create default family tree for user
    const treeResult = await database.query(
      "SELECT * FROM family_trees WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let treeId: string;
    if (treeResult.rows.length === 0) {
      // Create default family tree
      treeId = uuidv4();
      await database.query(
        "INSERT INTO family_trees (id, name, description, user_id) VALUES ($1, $2, $3, $4)",
        [treeId, "My Family Tree", "Default family tree", userId]
      );
    } else {
      treeId = treeResult.rows[0].id;
    }

    // Get family members
    const membersResult = await database.query(
      "SELECT * FROM family_members WHERE tree_id = $1 ORDER BY created_at",
      [treeId]
    );

    // Get relationships
    const relationshipsResult = await database.query(
      "SELECT * FROM family_relationships WHERE tree_id = $1 ORDER BY created_at",
      [treeId]
    );

    // Build the family tree object
    const familyTree: FamilyTree = {
      id: treeId,
      name: treeResult.rows[0]?.name || "My Family Tree",
      description: treeResult.rows[0]?.description,
      members: membersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        firstName: row.first_name,
        middleName: row.middle_name,
        lastName: row.last_name,
        gender: row.gender,
        birthDate: row.birth_date,
        deathDate: row.death_date,
        profileImageUrl: row.profile_image_url,
        parentIds: row.parent_ids || [],
        childIds: row.child_ids || [],
        spouseIds: row.spouse_ids || [],
        treeId: row.tree_id,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      relationships: relationshipsResult.rows.map((row) => ({
        id: row.id,
        type: row.relationship_type,
        person1Id: row.person1_id,
        person2Id: row.person2_id,
        treeId: row.tree_id,
        userId: row.user_id,
        createdAt: row.created_at,
      })),
      userId,
      createdAt: treeResult.rows[0]?.created_at,
      updatedAt: treeResult.rows[0]?.updated_at,
    };

    res.json(familyTree);
  } catch (error) {
    logger.error("Error fetching family tree:", error);
    res.status(500).json({ error: "Failed to fetch family tree" });
  }
});

/**
 * @swagger
 * /api/genealogy/members:
 *   post:
 *     summary: Add a new family member
 *     tags: [Genealogy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *                 enum: [male, female, other, unknown]
 *               birthDate:
 *                 type: string
 *               deathDate:
 *                 type: string
 *               profileImageUrl:
 *                 type: string
 *               parentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Family member created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/members",
  [
    body("name")
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage("Name must be less than 255 characters"),
    body("firstName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("First name must be less than 100 characters"),
    body("middleName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Middle name must be less than 100 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Last name must be less than 100 characters"),
    body("gender")
      .optional()
      .isIn(["male", "female", "other", "unknown"])
      .withMessage("Invalid gender value"),
    body("birthDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid birth date format"),
    body("deathDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid death date format"),
    body("profileImageUrl")
      .optional()
      .isURL()
      .withMessage("Invalid profile image URL"),
    body("parentIds")
      .optional()
      .isArray()
      .withMessage("Parent IDs must be an array"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation Error",
          details: errors.array(),
        });
      }

      // Auth check
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Authorization header is required",
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;

      if (!decoded.userId) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid token",
        });
      }

      const userId = decoded.userId;

      const { 
        name, 
        firstName, 
        middleName, 
        lastName, 
        gender, 
        birthDate, 
        deathDate, 
        profileImageUrl, 
        parentIds 
      } = req.body;

      // If separate name fields provided, compute full name
      let computedName = name;
      if (!computedName && (firstName || lastName)) {
        computedName = [firstName, middleName, lastName]
          .filter(n => n && n.trim())
          .join(' ');
      }

      // Validate that we have some form of name
      if (!computedName || !computedName.trim()) {
        return res.status(400).json({
          error: "Validation Error",
          message: "Either name or firstName/lastName must be provided",
        });
      }

      // Get or create default family tree
      const treeResult = await database.query(
        "SELECT id FROM family_trees WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        [userId]
      );

      let treeId: string;
      if (treeResult.rows.length === 0) {
        treeId = uuidv4();
        await database.query(
          "INSERT INTO family_trees (id, name, description, user_id) VALUES ($1, $2, $3, $4)",
          [treeId, "My Family Tree", "Default family tree", userId]
        );
      } else {
        treeId = treeResult.rows[0].id;
      }

      // Create new family member
      const memberId = uuidv4();
      const result = await database.query(
        `INSERT INTO family_members 
         (id, name, first_name, middle_name, last_name, gender, birth_date, death_date, profile_image_url, parent_ids, child_ids, spouse_ids, tree_id, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
         RETURNING *`,
        [
          memberId,
          computedName,
          firstName?.trim() || null,
          middleName?.trim() || null,
          lastName?.trim() || null,
          gender || "unknown",
          birthDate || null,
          deathDate || null,
          profileImageUrl || null,
          JSON.stringify(parentIds || []),
          JSON.stringify([]),
          JSON.stringify([]),
          treeId,
          userId,
        ]
      );

      const newMember = result.rows[0];

      // If parentIds provided, create parent-child relationships
      if (parentIds && parentIds.length > 0) {
        for (const parentId of parentIds) {
          const relationshipId = uuidv4();
          await database.query(
            "INSERT INTO family_relationships (id, relationship_type, person1_id, person2_id, tree_id, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
            [relationshipId, "PARENT_CHILD", parentId, memberId, treeId, userId]
          );

          // Update parent's child_ids
          await database.query(
            "UPDATE family_members SET child_ids = jsonb_insert(COALESCE(child_ids, '[]'::jsonb), '{-1}', $1::jsonb) WHERE id = $2",
            [JSON.stringify(memberId), parentId]
          );
        }
      }

      const familyMember: FamilyMember = {
        id: newMember.id,
        name: newMember.name,
        gender: newMember.gender,
        birthDate: newMember.birth_date,
        deathDate: newMember.death_date,
        profileImageUrl: newMember.profile_image_url,
        parentIds: JSON.parse(newMember.parent_ids || "[]"),
        childIds: JSON.parse(newMember.child_ids || "[]"),
        spouseIds: JSON.parse(newMember.spouse_ids || "[]"),
        treeId: newMember.tree_id,
        userId: newMember.user_id,
        createdAt: newMember.created_at,
        updatedAt: newMember.updated_at,
      };

      res.status(201).json(familyMember);
    } catch (error) {
      logger.error("Error creating family member:", error);
      res.status(500).json({ error: "Failed to create family member" });
    }
  }
);

/**
 * @swagger
 * /api/genealogy/relationships:
 *   post:
 *     summary: Create a relationship between two family members
 *     tags: [Genealogy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - person1Id
 *               - person2Id
 *               - type
 *             properties:
 *               person1Id:
 *                 type: string
 *               person2Id:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [SPOUSE, PARENT_CHILD, SIBLING]
 *     responses:
 *       201:
 *         description: Relationship created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/relationships",
  [
    body("person1Id").isUUID().withMessage("Invalid person1Id"),
    body("person2Id").isUUID().withMessage("Invalid person2Id"),
    body("type")
      .isIn(["SPOUSE", "PARENT_CHILD", "SIBLING"])
      .withMessage("Invalid relationship type"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation Error",
          details: errors.array(),
        });
      }

      // Auth check
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Authorization header is required",
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET as string) as JWTPayload;

      if (!decoded.userId) {
        return res.status(401).json({
          error: "Authentication Failed",
          message: "Invalid token",
        });
      }

      const userId = decoded.userId;

      const { person1Id, person2Id, type } = req.body;

      // Verify both persons exist and belong to user
      const person1Result = await database.query(
        "SELECT * FROM family_members WHERE id = $1 AND user_id = $2",
        [person1Id, userId]
      );

      const person2Result = await database.query(
        "SELECT * FROM family_members WHERE id = $1 AND user_id = $2",
        [person2Id, userId]
      );

      if (person1Result.rows.length === 0 || person2Result.rows.length === 0) {
        return res
          .status(404)
          .json({ error: "One or both family members not found" });
      }

      const treeId = person1Result.rows[0].tree_id;

      // Create relationship
      const relationshipId = uuidv4();
      const result = await database.query(
        "INSERT INTO family_relationships (id, relationship_type, person1_id, person2_id, tree_id, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [relationshipId, type, person1Id, person2Id, treeId, userId]
      );

      // Update denormalized data based on relationship type
      if (type === "SPOUSE") {
        // Add to spouse arrays
        await database.query(
          "UPDATE family_members SET spouse_ids = jsonb_insert(COALESCE(spouse_ids, '[]'::jsonb), '{-1}', $1::jsonb) WHERE id = $2",
          [JSON.stringify(person2Id), person1Id]
        );
        await database.query(
          "UPDATE family_members SET spouse_ids = jsonb_insert(COALESCE(spouse_ids, '[]'::jsonb), '{-1}', $1::jsonb) WHERE id = $2",
          [JSON.stringify(person1Id), person2Id]
        );
      } else if (type === "PARENT_CHILD") {
        // person1 is parent, person2 is child
        await database.query(
          "UPDATE family_members SET child_ids = jsonb_insert(COALESCE(child_ids, '[]'::jsonb), '{-1}', $1::jsonb) WHERE id = $2",
          [JSON.stringify(person2Id), person1Id]
        );
        await database.query(
          "UPDATE family_members SET parent_ids = jsonb_insert(COALESCE(parent_ids, '[]'::jsonb), '{-1}', $1::jsonb) WHERE id = $2",
          [JSON.stringify(person1Id), person2Id]
        );
      }

      const relationship: Relationship = {
        id: result.rows[0].id,
        type: result.rows[0].relationship_type,
        person1Id: result.rows[0].person1_id,
        person2Id: result.rows[0].person2_id,
        treeId: result.rows[0].tree_id,
        userId: result.rows[0].user_id,
        createdAt: result.rows[0].created_at,
      };

      res.status(201).json(relationship);
    } catch (error) {
      logger.error("Error creating relationship:", error);
      res.status(500).json({ error: "Failed to create relationship" });
    }
  }
);

export { router as genealogyRoutes };
