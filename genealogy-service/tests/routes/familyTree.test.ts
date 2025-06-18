// tests/routes/familyTree.test.ts
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../src/server";
import { FamilyTree } from "../../src/models/FamilyTree";
import { Person } from "../../src/models/Person";
import { Relationship } from "../../src/models/Relationship";
import jwt from "jsonwebtoken";

// Mock authentication middleware
jest.mock("../../../../src/shared/middleware/auth", () => ({
  authMiddleware: (req, res, next) => {
    // Mock authenticated user
    req.user = {
      id: "test-user-id",
      email: "test@example.com",
      role: "user",
    };
    next();
  },
}));

// Mock activity logging service
jest.mock("../../src/services/activityLogService", () => ({
  recordActivity: jest.fn().mockResolvedValue(true),
}));

describe("Family Tree API Routes", () => {
  let mongoServer: MongoMemoryServer;
  let testTreeId: string;
  let testPersonId1: string;
  let testPersonId2: string;
  let testRelationshipId: string;

  // Setup before all tests
  beforeAll(async () => {
    // Create an in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri);

    // Create test data
    // Create a test family tree
    const familyTree = new FamilyTree({
      name: "Test Family Tree",
      description: "A test family tree for API testing",
      ownerId: "test-user-id",
      privacy: "private",
      settings: {
        allowComments: true,
        theme: "default",
      },
    });
    const savedTree = await familyTree.save();
    testTreeId = savedTree._id.toString();

    // Create test person records
    const person1 = new Person({
      firstName: "John",
      lastName: "Doe",
      gender: "male",
      birthDate: "1950-01-01",
      familyTreeId: testTreeId,
    });
    const savedPerson1 = await person1.save();
    testPersonId1 = savedPerson1._id.toString();

    const person2 = new Person({
      firstName: "Jane",
      lastName: "Doe",
      gender: "female",
      birthDate: "1955-05-05",
      familyTreeId: testTreeId,
    });
    const savedPerson2 = await person2.save();
    testPersonId2 = savedPerson2._id.toString();

    // Create test relationship
    const relationship = new Relationship({
      person1Id: testPersonId1,
      person2Id: testPersonId2,
      type: "SPOUSE",
      familyTreeId: testTreeId,
    });
    const savedRelationship = await relationship.save();
    testRelationshipId = savedRelationship._id.toString();

    // Update family tree with root person
    savedTree.rootPersonId = testPersonId1;
    await savedTree.save();
  });

  // Clean up after all tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Test: GET /api/family-trees - List family trees
  describe("GET /api/family-trees", () => {
    it("should return a list of family trees for the authenticated user", async () => {
      const response = await request(app)
        .get("/api/family-trees")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("trees");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.trees).toBeInstanceOf(Array);
      expect(response.body.trees.length).toBeGreaterThan(0);
      expect(response.body.trees[0].name).toBe("Test Family Tree");
      expect(response.body.trees[0].ownerId).toBe("test-user-id");
    });

    it("should paginate results correctly", async () => {
      const response = await request(app)
        .get("/api/family-trees?page=1&limit=10")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.pagination).toHaveProperty("page", 1);
      expect(response.body.pagination).toHaveProperty("limit", 10);
      expect(response.body.pagination).toHaveProperty("total");
    });

    it("should filter by search term", async () => {
      const response = await request(app)
        .get("/api/family-trees?search=Test")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.trees.length).toBeGreaterThan(0);
      expect(response.body.trees[0].name).toContain("Test");
    });

    it("should return empty array when no trees match search", async () => {
      const response = await request(app)
        .get("/api/family-trees?search=NonExistentTree")
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.trees).toBeInstanceOf(Array);
      expect(response.body.trees.length).toBe(0);
    });
  });

  // Test: GET /api/family-trees/:id - Get single family tree
  describe("GET /api/family-trees/:id", () => {
    it("should return a single family tree by ID", async () => {
      const response = await request(app)
        .get(`/api/family-trees/${testTreeId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testTreeId);
      expect(response.body).toHaveProperty("name", "Test Family Tree");
      expect(response.body).toHaveProperty("ownerId", "test-user-id");
      expect(response.body).toHaveProperty("members");
      expect(response.body).toHaveProperty("relationships");
      expect(response.body.members).toBeInstanceOf(Array);
      expect(response.body.relationships).toBeInstanceOf(Array);
    });

    it("should return 404 for non-existent tree ID", async () => {
      await request(app)
        .get("/api/family-trees/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should return 400 for invalid tree ID format", async () => {
      await request(app).get("/api/family-trees/invalid-id").expect(400);
    });
  });

  // Test: POST /api/family-trees - Create family tree
  describe("POST /api/family-trees", () => {
    it("should create a new family tree", async () => {
      const newTree = {
        name: "New Test Family Tree",
        description: "A newly created test family tree",
        privacy: "public",
      };

      const response = await request(app)
        .post("/api/family-trees")
        .send(newTree)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "New Test Family Tree");
      expect(response.body).toHaveProperty("ownerId", "test-user-id");
      expect(response.body).toHaveProperty("createdAt");
      expect(response.body).toHaveProperty("privacy", "public");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/family-trees")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toBeInstanceOf(Array);
    });
  });

  // Test: PUT /api/family-trees/:id - Update family tree
  describe("PUT /api/family-trees/:id", () => {
    it("should update an existing family tree", async () => {
      const updates = {
        name: "Updated Test Family Tree",
        description: "This tree has been updated",
        privacy: "private",
        settings: {
          allowComments: false,
          theme: "dark",
        },
      };

      const response = await request(app)
        .put(`/api/family-trees/${testTreeId}`)
        .send(updates)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testTreeId);
      expect(response.body).toHaveProperty("name", "Updated Test Family Tree");
      expect(response.body).toHaveProperty(
        "description",
        "This tree has been updated"
      );
      expect(response.body).toHaveProperty("privacy", "private");
      expect(response.body.settings).toHaveProperty("allowComments", false);
      expect(response.body.settings).toHaveProperty("theme", "dark");
    });

    it("should return 404 for non-existent tree ID", async () => {
      await request(app)
        .put("/api/family-trees/60c72b2f5c4b0a1234567890")
        .send({ name: "Updated Name" })
        .expect(404);
    });

    it("should return 403 when trying to update a tree that does not belong to the user", async () => {
      // Create a tree with a different owner
      const otherTree = new FamilyTree({
        name: "Other User Tree",
        ownerId: "other-user-id",
        privacy: "private",
      });
      const savedOtherTree = await otherTree.save();

      await request(app)
        .put(`/api/family-trees/${savedOtherTree._id}`)
        .send({ name: "Attempt to update" })
        .expect(403);
    });
  });

  // Test: DELETE /api/family-trees/:id - Delete family tree
  describe("DELETE /api/family-trees/:id", () => {
    it("should delete a family tree", async () => {
      // Create a tree to delete
      const treeToDelete = new FamilyTree({
        name: "Tree to Delete",
        ownerId: "test-user-id",
        privacy: "private",
      });
      const savedTree = await treeToDelete.save();

      await request(app)
        .delete(`/api/family-trees/${savedTree._id}`)
        .expect(200);

      // Verify it was deleted
      const findDeletedTree = await FamilyTree.findById(savedTree._id);
      expect(findDeletedTree).toBeNull();
    });

    it("should return 404 for non-existent tree ID", async () => {
      await request(app)
        .delete("/api/family-trees/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should return 403 when trying to delete a tree that does not belong to the user", async () => {
      // Create a tree with a different owner
      const otherTree = new FamilyTree({
        name: "Other User Tree",
        ownerId: "other-user-id",
        privacy: "private",
      });
      const savedOtherTree = await otherTree.save();

      await request(app)
        .delete(`/api/family-trees/${savedOtherTree._id}`)
        .expect(403);
    });
  });

  // Test: POST /api/family-trees/:id/members - Add person to tree
  describe("POST /api/family-trees/:id/members", () => {
    it("should add a new person to the family tree", async () => {
      const newPerson = {
        firstName: "Alice",
        lastName: "Smith",
        gender: "female",
        birthDate: "1980-03-15",
        birthPlace: "New York, USA",
      };

      const response = await request(app)
        .post(`/api/family-trees/${testTreeId}/members`)
        .send(newPerson)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("firstName", "Alice");
      expect(response.body).toHaveProperty("lastName", "Smith");
      expect(response.body).toHaveProperty("gender", "female");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post(`/api/family-trees/${testTreeId}/members`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("errors");
    });

    it("should return 404 for non-existent tree ID", async () => {
      await request(app)
        .post("/api/family-trees/60c72b2f5c4b0a1234567890/members")
        .send({
          firstName: "Test",
          lastName: "Person",
        })
        .expect(404);
    });
  });

  // Test: POST /api/family-trees/:id/relationships - Add relationship to tree
  describe("POST /api/family-trees/:id/relationships", () => {
    it("should add a new relationship between persons in the tree", async () => {
      // Create two persons to establish a relationship
      const person1 = new Person({
        firstName: "Father",
        lastName: "Test",
        gender: "male",
        familyTreeId: testTreeId,
      });
      const savedPerson1 = await person1.save();

      const person2 = new Person({
        firstName: "Child",
        lastName: "Test",
        gender: "female",
        familyTreeId: testTreeId,
      });
      const savedPerson2 = await person2.save();

      const newRelationship = {
        person1Id: savedPerson1._id.toString(),
        person2Id: savedPerson2._id.toString(),
        type: "PARENT_CHILD",
      };

      const response = await request(app)
        .post(`/api/family-trees/${testTreeId}/relationships`)
        .send(newRelationship)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty(
        "person1Id",
        savedPerson1._id.toString()
      );
      expect(response.body).toHaveProperty(
        "person2Id",
        savedPerson2._id.toString()
      );
      expect(response.body).toHaveProperty("type", "PARENT_CHILD");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post(`/api/family-trees/${testTreeId}/relationships`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("errors");
    });

    it("should return 404 for persons not in the specified tree", async () => {
      // Create a person in a different tree
      const otherTree = new FamilyTree({
        name: "Another Tree",
        ownerId: "test-user-id",
      });
      const savedOtherTree = await otherTree.save();

      const personInOtherTree = new Person({
        firstName: "Other",
        lastName: "Person",
        familyTreeId: savedOtherTree._id,
      });
      const savedPerson = await personInOtherTree.save();

      await request(app)
        .post(`/api/family-trees/${testTreeId}/relationships`)
        .send({
          person1Id: testPersonId1,
          person2Id: savedPerson._id.toString(),
          type: "SPOUSE",
        })
        .expect(404);
    });
  });
});
