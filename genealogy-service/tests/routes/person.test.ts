// tests/routes/person.test.ts
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

describe("Person API Routes", () => {
  let mongoServer: MongoMemoryServer;
  let testTreeId: string;
  let testPersonId: string;

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

    // Create a test person
    const person = new Person({
      firstName: "John",
      lastName: "Doe",
      gender: "male",
      birthDate: "1950-01-01",
      birthPlace: "New York, USA",
      deathDate: null,
      familyTreeId: testTreeId,
      profilePhoto: "/path/to/photo.jpg",
      notes: "Test notes about John",
      customFields: {
        occupation: "Engineer",
        religion: "Catholic",
      },
    });
    const savedPerson = await person.save();
    testPersonId = savedPerson._id.toString();
  });

  // Clean up after all tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Test: GET /api/persons - List persons
  describe("GET /api/persons", () => {
    it("should return a list of persons with proper pagination", async () => {
      const response = await request(app)
        .get("/api/persons")
        .query({ familyTreeId: testTreeId })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("persons");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body.persons).toBeInstanceOf(Array);
      expect(response.body.persons.length).toBeGreaterThan(0);
      expect(response.body.persons[0]).toHaveProperty("firstName", "John");
      expect(response.body.persons[0]).toHaveProperty("lastName", "Doe");
    });

    it("should filter persons by search term", async () => {
      // Create another person to test search
      const anotherPerson = new Person({
        firstName: "Jane",
        lastName: "Smith",
        gender: "female",
        familyTreeId: testTreeId,
      });
      await anotherPerson.save();

      const response = await request(app)
        .get("/api/persons")
        .query({
          familyTreeId: testTreeId,
          search: "John",
        })
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body.persons.length).toBeGreaterThan(0);
      expect(response.body.persons[0].firstName).toBe("John");

      // Should not include Jane in results
      expect(response.body.persons.some((p) => p.firstName === "Jane")).toBe(
        false
      );
    });

    it("should return 400 when no familyTreeId is provided", async () => {
      await request(app).get("/api/persons").expect(400);
    });
  });

  // Test: GET /api/persons/:id - Get single person
  describe("GET /api/persons/:id", () => {
    it("should return a single person by ID", async () => {
      const response = await request(app)
        .get(`/api/persons/${testPersonId}`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testPersonId);
      expect(response.body).toHaveProperty("firstName", "John");
      expect(response.body).toHaveProperty("lastName", "Doe");
      expect(response.body).toHaveProperty("gender", "male");
      expect(response.body).toHaveProperty("birthDate", "1950-01-01");
      expect(response.body).toHaveProperty("birthPlace", "New York, USA");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
      expect(response.body).toHaveProperty("customFields");
      expect(response.body.customFields).toHaveProperty(
        "occupation",
        "Engineer"
      );
    });

    it("should return 404 for non-existent person ID", async () => {
      await request(app)
        .get("/api/persons/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should return 400 for invalid person ID format", async () => {
      await request(app).get("/api/persons/invalid-id").expect(400);
    });
  });

  // Test: POST /api/persons - Create person
  describe("POST /api/persons", () => {
    it("should create a new person", async () => {
      const newPerson = {
        firstName: "Robert",
        lastName: "Johnson",
        gender: "male",
        birthDate: "1960-12-15",
        birthPlace: "Chicago, USA",
        familyTreeId: testTreeId,
        customFields: {
          occupation: "Doctor",
          education: "University of Chicago",
        },
      };

      const response = await request(app)
        .post("/api/persons")
        .send(newPerson)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("firstName", "Robert");
      expect(response.body).toHaveProperty("lastName", "Johnson");
      expect(response.body).toHaveProperty("gender", "male");
      expect(response.body).toHaveProperty("familyTreeId", testTreeId);
      expect(response.body.customFields).toHaveProperty("occupation", "Doctor");
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/persons")
        .send({
          lastName: "Smith",
          // Missing firstName, familyTreeId
        })
        .expect(400);

      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors).toBeInstanceOf(Array);
    });

    it("should return 404 for non-existent family tree ID", async () => {
      await request(app)
        .post("/api/persons")
        .send({
          firstName: "Test",
          lastName: "Person",
          familyTreeId: "60c72b2f5c4b0a1234567890", // Non-existent ID
        })
        .expect(404);
    });
  });

  // Test: PUT /api/persons/:id - Update person
  describe("PUT /api/persons/:id", () => {
    it("should update an existing person", async () => {
      const updates = {
        firstName: "John Updated",
        lastName: "Doe Updated",
        deathDate: "2020-05-10",
        deathPlace: "Boston, USA",
        customFields: {
          occupation: "Senior Engineer",
          hobbies: "Reading, Gardening",
        },
      };

      const response = await request(app)
        .put(`/api/persons/${testPersonId}`)
        .send(updates)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("id", testPersonId);
      expect(response.body).toHaveProperty("firstName", "John Updated");
      expect(response.body).toHaveProperty("lastName", "Doe Updated");
      expect(response.body).toHaveProperty("deathDate", "2020-05-10");
      expect(response.body).toHaveProperty("deathPlace", "Boston, USA");
      expect(response.body.customFields).toHaveProperty(
        "occupation",
        "Senior Engineer"
      );
      expect(response.body.customFields).toHaveProperty(
        "hobbies",
        "Reading, Gardening"
      );

      // Should keep original fields that weren't updated
      expect(response.body).toHaveProperty("birthDate", "1950-01-01");
      expect(response.body).toHaveProperty("birthPlace", "New York, USA");
    });

    it("should return 404 for non-existent person ID", async () => {
      await request(app)
        .put("/api/persons/60c72b2f5c4b0a1234567890")
        .send({ firstName: "Updated Name" })
        .expect(404);
    });

    it("should return 403 when trying to update a person from a tree that does not belong to the user", async () => {
      // Create a tree with a different owner
      const otherTree = new FamilyTree({
        name: "Other User Tree",
        ownerId: "other-user-id",
        privacy: "private",
      });
      const savedOtherTree = await otherTree.save();

      // Create a person in that tree
      const personInOtherTree = new Person({
        firstName: "Other",
        lastName: "Person",
        familyTreeId: savedOtherTree._id,
      });
      const savedPerson = await personInOtherTree.save();

      await request(app)
        .put(`/api/persons/${savedPerson._id}`)
        .send({ firstName: "Attempt to update" })
        .expect(403);
    });
  });

  // Test: DELETE /api/persons/:id - Delete person
  describe("DELETE /api/persons/:id", () => {
    it("should delete a person", async () => {
      // Create a person to delete
      const personToDelete = new Person({
        firstName: "Delete",
        lastName: "Me",
        familyTreeId: testTreeId,
      });
      const savedPerson = await personToDelete.save();

      await request(app).delete(`/api/persons/${savedPerson._id}`).expect(200);

      // Verify it was deleted
      const findDeletedPerson = await Person.findById(savedPerson._id);
      expect(findDeletedPerson).toBeNull();
    });

    it("should return 404 for non-existent person ID", async () => {
      await request(app)
        .delete("/api/persons/60c72b2f5c4b0a1234567890")
        .expect(404);
    });

    it("should delete associated relationships when a person is deleted", async () => {
      // Create two persons
      const person1 = new Person({
        firstName: "Person",
        lastName: "One",
        familyTreeId: testTreeId,
      });
      const savedPerson1 = await person1.save();

      const person2 = new Person({
        firstName: "Person",
        lastName: "Two",
        familyTreeId: testTreeId,
      });
      const savedPerson2 = await person2.save();

      // Create a relationship between them
      const relationship = new Relationship({
        person1Id: savedPerson1._id,
        person2Id: savedPerson2._id,
        type: "SPOUSE",
        familyTreeId: testTreeId,
      });
      await relationship.save();

      // Delete one person
      await request(app).delete(`/api/persons/${savedPerson1._id}`).expect(200);

      // Check that the relationship was also deleted
      const findRelationship = await Relationship.findOne({
        $or: [{ person1Id: savedPerson1._id }, { person2Id: savedPerson1._id }],
      });

      expect(findRelationship).toBeNull();
    });
  });

  // Test: POST /api/persons/:id/photo - Upload person photo
  describe("POST /api/persons/:id/photo", () => {
    it("should upload a profile photo for a person", async () => {
      // This test is more complex because it involves file upload
      // For simplicity, we'll mock the file upload process

      // Mock the multer middleware and file handling
      const response = await request(app)
        .post(`/api/persons/${testPersonId}/photo`)
        .attach("photo", Buffer.from("fake image data"), {
          filename: "test-photo.jpg",
          contentType: "image/jpeg",
        })
        .expect(200);

      expect(response.body).toHaveProperty("profilePhoto");
      expect(response.body.profilePhoto).toContain("test-photo");

      // Verify the person was updated
      const updatedPerson = await Person.findById(testPersonId);
      expect(updatedPerson?.profilePhoto).toBeDefined();
    });

    it("should return 400 for missing photo file", async () => {
      await request(app).post(`/api/persons/${testPersonId}/photo`).expect(400);
    });

    it("should return 404 for non-existent person ID", async () => {
      await request(app)
        .post("/api/persons/60c72b2f5c4b0a1234567890/photo")
        .attach("photo", Buffer.from("fake image data"), {
          filename: "test-photo.jpg",
          contentType: "image/jpeg",
        })
        .expect(404);
    });
  });

  // Test: GET /api/persons/:id/relatives - Get person relatives
  describe("GET /api/persons/:id/relatives", () => {
    it("should return all relatives of a person", async () => {
      // Create a family structure to test relatives
      // Parent
      const parent = new Person({
        firstName: "Parent",
        lastName: "Test",
        gender: "male",
        familyTreeId: testTreeId,
      });
      const savedParent = await parent.save();

      // Child
      const child = new Person({
        firstName: "Child",
        lastName: "Test",
        gender: "female",
        familyTreeId: testTreeId,
      });
      const savedChild = await child.save();

      // Spouse
      const spouse = new Person({
        firstName: "Spouse",
        lastName: "Test",
        gender: "female",
        familyTreeId: testTreeId,
      });
      const savedSpouse = await spouse.save();

      // Create relationships
      await Relationship.create({
        person1Id: savedParent._id,
        person2Id: savedChild._id,
        type: "PARENT_CHILD",
        familyTreeId: testTreeId,
      });

      await Relationship.create({
        person1Id: savedParent._id,
        person2Id: savedSpouse._id,
        type: "SPOUSE",
        familyTreeId: testTreeId,
      });

      const response = await request(app)
        .get(`/api/persons/${savedParent._id}/relatives`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("children");
      expect(response.body).toHaveProperty("spouses");
      expect(response.body).toHaveProperty("parents");
      expect(response.body.children).toBeInstanceOf(Array);
      expect(response.body.spouses).toBeInstanceOf(Array);
      expect(response.body.parents).toBeInstanceOf(Array);

      // Check that child and spouse are in the response
      expect(response.body.children.length).toBe(1);
      expect(response.body.children[0].id).toBe(savedChild._id.toString());
      expect(response.body.spouses.length).toBe(1);
      expect(response.body.spouses[0].id).toBe(savedSpouse._id.toString());
    });

    it("should return empty arrays when person has no relatives", async () => {
      // Create a person with no relationships
      const loner = new Person({
        firstName: "Loner",
        lastName: "Test",
        familyTreeId: testTreeId,
      });
      const savedLoner = await loner.save();

      const response = await request(app)
        .get(`/api/persons/${savedLoner._id}/relatives`)
        .expect("Content-Type", /json/)
        .expect(200);

      expect(response.body).toHaveProperty("children");
      expect(response.body).toHaveProperty("spouses");
      expect(response.body).toHaveProperty("parents");
      expect(response.body.children).toBeInstanceOf(Array);
      expect(response.body.spouses).toBeInstanceOf(Array);
      expect(response.body.parents).toBeInstanceOf(Array);
      expect(response.body.children.length).toBe(0);
      expect(response.body.spouses.length).toBe(0);
      expect(response.body.parents.length).toBe(0);
    });

    it("should return 404 for non-existent person ID", async () => {
      await request(app)
        .get("/api/persons/60c72b2f5c4b0a1234567890/relatives")
        .expect(404);
    });
  });
});
