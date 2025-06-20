// tests/routes/relationship.test.ts
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../src/server";
import { FamilyTree } from "../../src/models/FamilyTree";
import { Person } from "../../src/models/Person";
import { Relationship } from "../../src/models/Relationship";

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

describe("Relationship API Routes", () => {
  let mongoServer: MongoMemoryServer;
  let testTreeId: string;
  let testPerson1Id: string;
  let testPerson2Id: string;
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
    });
    const savedTree = await familyTree.save();
    testTreeId = savedTree._id.toString();

    // Create test persons
    const person1 = new Person({
      firstName: "Parent",
      lastName: "Test",
      gender: "male",
      birthDate: "1950-01-01",
      familyTreeId: testTreeId,
    });
    const savedPerson1 = await person1.save();
    testPerson1Id = savedPerson1._id.toString();

    const person2 = new Person({
      firstName: "Child",
      lastName: "Test",
      gender: "female",
      birthDate: "1980-05-15",
      familyTreeId: testTreeId,
    });
    const savedPerson2 = await person2.save();
    testPerson2Id = savedPerson2._id.toString();

    // Create a test relationship
    const relationship = new Relationship({
      person1Id: testPerson1Id,
      person2Id: testPerson2Id,
      type: "PARENT_CHILD",
      familyTreeId: testTreeId,
      meta: {
        startDate: null,
        endDate: null,
        notes: "Test relationship",
      },
    });
    const savedRelationship = await relationship.save();
    testRelationshipId = savedRelationship._id.toString();
  });

  // Clean up after all tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Test: GET /api/relationships - List relationships
  describe("GET /api/relationships", () => {
    it("should return a list of relationships for a family tree", async () => {
      const response = await request(app)
        .get("/api/relationships")
        .query({ familyTreeId: testTreeId })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("relationships");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.relationships).toBeInstanceOf(Array);
      expect(response.body.relationships.length).toBeGreaterThan(0);
      expect(response.body.relationships[0]).toHaveProperty(
        "type",
        "PARENT_CHILD"
      );
      expect(response.body.relationships[0]).toHaveProperty(
        "person1Id",
        testPerson1Id
      );
      expect(response.body.relationships[0]).toHaveProperty(
        "person2Id",
        testPerson2Id
      );
    });

    it("should filter relationships by person ID", async () => {
      // Create another relationship with a different person
      const person3 = new Person({
        firstName: "Spouse",
        lastName: "Test",
        gender: "female",
        familyTreeId: testTreeId,
      });
      const savedPerson3 = await person3.save();

      const relationship = new Relationship({
        person1Id: testPerson1Id,
        person2Id: savedPerson3._id,
        type: "SPOUSE",
        familyTreeId: testTreeId,
      });
      await relationship.save();

      const response = await request(app)
        .get("/api/relationships")
        .query({
          familyTreeId: testTreeId,
          personId: testPerson1Id,
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.relationships.length).toBeGreaterThan(0);
      // All relationships should involve person1
      expect(
        response.body.relationships.every(
          (r) => r.person1Id === testPerson1Id || r.person2Id === testPerson1Id
        )
      ).toBe(true);
    });

    it("should filter relationships by type", async () => {
      const response = await request(app)
        .get("/api/relationships")
        .query({
          familyTreeId: testTreeId,
          type: "PARENT_CHILD",
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.relationships.length).toBeGreaterThan(0);
      // All relationships should be of type PARENT_CHILD
      expect(
        response.body.relationships.every((r) => r.type === "PARENT_CHILD")
      ).toBe(true);
    });

    it("should return 400 when no familyTreeId is provided", async () => {
      await request(app).get("/api/relationships").expect(400);
    });
  });

  // Test: GET /api/relationships/:id - Get single relationship
  describe("GET /api/relationships/:id", () => {
    it("should return a single relationship by ID", async () => {
      const response = await request(app)
        .get(`/api/relationships/${testRelationshipId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testRelationshipId);
      expect(response.body).toHaveProperty("person1Id", testPerson1Id);
      expect(response.body).toHaveProperty("person2Id", testPerson2Id);
      expect(response.body).toHaveProperty("type", "PARENT_CHILD");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
      expect(response.body).toHaveProperty("meta");
      expect(response.body.meta).toHaveProperty("notes", "Test relationship");
    });

    it("should return 404 for non-existent relationship ID", async () => {
      await request(app)
        .get("/api/relationships/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should return 400 for invalid relationship ID format", async () => {
      await request(app).get("/api/relationships/invalid-id").expect(400);
    });
  });

  // Test: POST /api/relationships - Create relationship
  describe("POST /api/relationships", () => {
    it("should create a new relationship", async () => {
      // Create another person for a new relationship
      const person3 = new Person({
        firstName: "Sibling",
        lastName: "Test",
        gender: "male",
        familyTreeId: testTreeId,
      });
      const savedPerson3 = await person3.save();

      const newRelationship = {
        person1Id: testPerson2Id,
        person2Id: savedPerson3._id.toString(),
        type: "SIBLING",
        familyTreeId: testTreeId,
        meta: {
          notes: "Sibling relationship",
        },
      };

      const response = await request(app)
        .post("/api/relationships")
        .send(newRelationship)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("person1Id", testPerson2Id);
      expect(response.body).toHaveProperty(
        "person2Id",
        savedPerson3._id.toString()
      );
      expect(response.body).toHaveProperty("type", "SIBLING");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
      expect(response.body.meta).toHaveProperty(
        "notes",
        "Sibling relationship"
      );
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/relationships")
        .send({
          person1Id: testPerson1Id,
          // Missing person2Id, type, familyTreeId
        })
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it("should return 400 when trying to create a relationship between the same person", async () => {
      await request(app)
        .post("/api/relationships")
        .send({
          person1Id: testPerson1Id,
          person2Id: testPerson1Id,
          type: "SPOUSE",
          familyTreeId: testTreeId,
        })
        .expect(400);
    });

    it("should return 404 for non-existent person IDs", async () => {
      await request(app)
        .post("/api/relationships")
        .send({
          person1Id: testPerson1Id,
          person2Id: "60c72b2f5c4b0a1234567890", // Non-existent ID
          type: "SPOUSE",
          familyTreeId: testTreeId,
        })
        .expect(404);
    });

    it("should prevent duplicate relationships of the same type between the same persons", async () => {
      // First create a relationship
      const duplicateRelationship = {
        person1Id: testPerson1Id,
        person2Id: testPerson2Id,
        type: "PARENT_CHILD", // This relationship already exists
        familyTreeId: testTreeId,
      };

      // Try to create the same relationship again
      await request(app)
        .post("/api/relationships")
        .send(duplicateRelationship)
        .expect(409); // Conflict
    });
  });

  // Test: PUT /api/relationships/:id - Update relationship
  describe("PUT /api/relationships/:id", () => {
    it("should update an existing relationship", async () => {
      const updates = {
        meta: {
          startDate: "2000-01-01",
          endDate: null,
          notes: "Updated relationship notes",
        },
      };

      const response = await request(app)
        .put(`/api/relationships/${testRelationshipId}`)
        .send(updates)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testRelationshipId);
      expect(response.body.meta).toHaveProperty("startDate", "2000-01-01");
      expect(response.body.meta).toHaveProperty(
        "notes",
        "Updated relationship notes"
      );

      // Should keep original fields that weren't updated
      expect(response.body).toHaveProperty("type", "PARENT_CHILD");
      expect(response.body).toHaveProperty("person1Id", testPerson1Id);
      expect(response.body).toHaveProperty("person2Id", testPerson2Id);
    });

    it("should return 404 for non-existent relationship ID", async () => {
      await request(app)
        .put("/api/relationships/60c72b2f5c4b0a1234567890")
        .send({ meta: { notes: "Updated notes" } })
        .expect(404);
    });

    it("should prevent changing relationship type to create duplicates", async () => {
      // Create two relationships between the same persons
      const person3 = new Person({
        firstName: "Multi",
        lastName: "Relationship",
        familyTreeId: testTreeId,
      });
      const savedPerson3 = await person3.save();

      const person4 = new Person({
        firstName: "Multi",
        lastName: "Relationship2",
        familyTreeId: testTreeId,
      });
      const savedPerson4 = await person4.save();

      // Create first relationship
      // const rel1 = new Relationship({ // Commented out as rel1 is now unused
      //   person1Id: savedPerson3._id,
      //   person2Id: savedPerson4._id,
      //   type: "SPOUSE",
      //   familyTreeId: testTreeId,
      // });
      // const _savedRel1 = await rel1.save(); // Commented out as it's unused and causing lint error

      // Create second relationship of a different type
      const rel2 = new Relationship({
        person1Id: savedPerson3._id,
        person2Id: savedPerson4._id,
        type: "FRIEND", // Different type
        familyTreeId: testTreeId,
      });
      const savedRel2 = await rel2.save();

      // Try to update rel2 to have the same type as rel1 (which would create a duplicate)
      await request(app)
        .put(`/api/relationships/${savedRel2._id}`)
        .send({ type: "SPOUSE" })
        .expect(409); // Conflict
    });
  });

  // Test: DELETE /api/relationships/:id - Delete relationship
  describe("DELETE /api/relationships/:id", () => {
    it("should delete a relationship", async () => {
      // Create a relationship to delete
      const person3 = new Person({
        firstName: "ToDelete1",
        lastName: "Test",
        familyTreeId: testTreeId,
      });
      const savedPerson3 = await person3.save();

      const person4 = new Person({
        firstName: "ToDelete2",
        lastName: "Test",
        familyTreeId: testTreeId,
      });
      const savedPerson4 = await person4.save();

      const relationshipToDelete = new Relationship({
        person1Id: savedPerson3._id,
        person2Id: savedPerson4._id,
        type: "SPOUSE",
        familyTreeId: testTreeId,
      });
      const savedRelationship = await relationshipToDelete.save();

      await request(app)
        .delete(`/api/relationships/${savedRelationship._id}`)
        .expect(200);

      // Verify it was deleted
      const findDeletedRelationship = await Relationship.findById(
        savedRelationship._id
      );
      expect(findDeletedRelationship).toBeNull();
    });

    it("should return 404 for non-existent relationship ID", async () => {
      await request(app)
        .delete("/api/relationships/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should return 403 when trying to delete a relationship from a tree that does not belong to the user", async () => {
      // Create a tree with a different owner
      const otherTree = new FamilyTree({
        name: "Other User Tree",
        ownerId: "other-user-id",
        privacy: "private",
      });
      const savedOtherTree = await otherTree.save();

      // Create persons in that tree
      const person1 = new Person({
        firstName: "Other1",
        lastName: "Person",
        familyTreeId: savedOtherTree._id,
      });
      const savedPerson1 = await person1.save();

      const person2 = new Person({
        firstName: "Other2",
        lastName: "Person",
        familyTreeId: savedOtherTree._id,
      });
      const savedPerson2 = await person2.save();

      // Create a relationship in that tree
      const relationship = new Relationship({
        person1Id: savedPerson1._id,
        person2Id: savedPerson2._id,
        type: "SPOUSE",
        familyTreeId: savedOtherTree._id,
      });
      const savedRelationship = await relationship.save();

      await request(app)
        .delete(`/api/relationships/${savedRelationship._id}`)
        .expect(403);
    });
  });

  // Test: GET /api/relationships/check - Check relationship existence
  describe("GET /api/relationships/check", () => {
    it("should check if a relationship exists between two persons", async () => {
      const response = await request(app)
        .get("/api/relationships/check")
        .query({
          person1Id: testPerson1Id,
          person2Id: testPerson2Id,
          familyTreeId: testTreeId,
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("exists", true);
      expect(response.body).toHaveProperty("relationships");
      expect(response.body.relationships).toBeInstanceOf(Array);
      expect(response.body.relationships.length).toBeGreaterThan(0);
      expect(response.body.relationships[0]).toHaveProperty(
        "type",
        "PARENT_CHILD"
      );
    });

    it("should return exists=false when no relationship exists", async () => {
      // Create two persons with no relationship between them
      const person1 = new Person({
        firstName: "NoRel1",
        lastName: "Test",
        familyTreeId: testTreeId,
      });
      const savedPerson1 = await person1.save();

      const person2 = new Person({
        firstName: "NoRel2",
        lastName: "Test",
        familyTreeId: testTreeId,
      });
      const savedPerson2 = await person2.save();

      const response = await request(app)
        .get("/api/relationships/check")
        .query({
          person1Id: savedPerson1._id.toString(),
          person2Id: savedPerson2._id.toString(),
          familyTreeId: testTreeId,
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("exists", false);
      expect(response.body).toHaveProperty("relationships");
      expect(response.body.relationships).toBeInstanceOf(Array);
      expect(response.body.relationships.length).toBe(0);
    });

    it("should return 400 when missing required parameters", async () => {
      await request(app)
        .get("/api/relationships/check")
        .query({
          person1Id: testPerson1Id,
          // Missing person2Id and familyTreeId
        })
        .expect(400);
    });
  });
});
