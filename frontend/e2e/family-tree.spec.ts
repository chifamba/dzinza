// e2e/family-tree.spec.ts
import { test, expect, Page } from "@playwright/test";

// We'll need to mock API responses for E2E tests, but we'll keep the core flows
// consistent with real user behavior

test.describe("Family Tree E2E Tests", () => {
  let page: Page;

  // Before each test, we'll set up a new page and authenticate
  test.beforeEach(async ({ browser }) => {
    // Create a new page for each test
    page = await browser.newPage();

    // Set up mock API responses - in a real scenario, we would use Mock Service Worker
    // to intercept and mock API calls
    await page.route("**/api/auth/login", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          token: "mock-jwt-token",
          user: {
            id: "user-123",
            name: "Test User",
            email: "test@example.com",
          },
        }),
      });
    });

    // Mock family tree API response
    await page.route("**/api/family-trees", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          trees: [
            {
              id: "tree-123",
              name: "Test Family Tree",
              ownerId: "user-123",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1,
          },
        }),
      });
    });

    // Navigate to the app and login
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/dashboard");
  });

  test("User Journey: Login to View Family Tree", async () => {
    // After login, we should be on the dashboard with family trees listed
    expect(page.url()).toContain("/dashboard");

    // Should see the list of family trees
    await expect(
      page.locator('h1:has-text("Your Family Trees")')
    ).toBeVisible();

    // Mock the single family tree response
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-3"],
            },
            {
              id: "person-2",
              name: "Jane Doe",
              gender: "female",
              birthDate: "1980-05-15",
              parentIds: ["person-1", "person-3"],
              childIds: [],
              spouseIds: [],
            },
            {
              id: "person-3",
              name: "Mary Doe",
              gender: "female",
              birthDate: "1955-10-20",
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-1"],
            },
          ],
          relationships: [
            {
              id: "rel-1",
              type: "SPOUSE",
              person1Id: "person-1",
              person2Id: "person-3",
            },
            {
              id: "rel-2",
              type: "PARENT_CHILD",
              person1Id: "person-1",
              person2Id: "person-2",
            },
            {
              id: "rel-3",
              type: "PARENT_CHILD",
              person1Id: "person-3",
              person2Id: "person-2",
            },
          ],
        }),
      });
    });

    // Click on a family tree to view it
    await page.click("text=Test Family Tree");

    // Should navigate to the family tree view
    await page.waitForURL("**/family-trees/tree-123");

    // Verify the tree is displayed
    await expect(page.locator('h1:has-text("Test Family Tree")')).toBeVisible();

    // The tree visualization should be visible
    await expect(page.locator(".family-tree-container")).toBeVisible();

    // Should see tree nodes
    await expect(page.locator(".tree-person-node")).toHaveCount(3);
  });

  test("User Journey: Create a New Person in Family Tree", async () => {
    // Navigate to a family tree first
    await page.click("text=Test Family Tree");
    await page.waitForURL("**/family-trees/tree-123");

    // Mock the API call for adding a new person
    await page.route("**/api/family-trees/tree-123/members", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: "new-person-id",
            firstName: "New",
            lastName: "Person",
            gender: "male",
            birthDate: "1990-05-15",
            familyTreeId: "tree-123",
          }),
        });
      }
    });

    // Mock the tree refresh after adding
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            /* existing members */
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-3"],
            },
            /* plus new person */
            {
              id: "new-person-id",
              name: "New Person",
              gender: "male",
              birthDate: "1990-05-15",
              parentIds: [],
              childIds: [],
              spouseIds: [],
            },
          ],
          relationships: [
            /* existing relationships */
          ],
        }),
      });
    });

    // Click add person button
    await page.click('button:has-text("Add Person")');

    // A modal should appear with a form
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator('h2:has-text("Add New Person")')).toBeVisible();

    // Fill out the form
    await page.fill('input[name="firstName"]', "New");
    await page.fill('input[name="lastName"]', "Person");
    await page.selectOption('select[name="gender"]', "male");
    await page.fill('input[name="birthDate"]', "1990-05-15");

    // Submit the form
    await page.click('button:has-text("Save")');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Tree should refresh and show the new person
    await expect(page.locator("text=New Person")).toBeVisible();
  });

  test("User Journey: Edit a Person in Family Tree", async () => {
    // Navigate to a family tree first
    await page.click("text=Test Family Tree");
    await page.waitForURL("**/family-trees/tree-123");

    // Mock the API call for updating a person
    await page.route("**/api/persons/person-1", (route) => {
      if (route.request().method() === "PUT") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: "person-1",
            firstName: "John",
            lastName: "Doe Updated",
            gender: "male",
            birthDate: "1950-01-01",
            familyTreeId: "tree-123",
          }),
        });
      }
    });

    // Mock the tree refresh after updating
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            {
              id: "person-1",
              name: "John Doe Updated", // Updated name
              gender: "male",
              birthDate: "1950-01-01",
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-3"],
            },
            // Other members...
          ],
          relationships: [
            // Relationships...
          ],
        }),
      });
    });

    // Click on a person node to select it
    await page.click("text=John Doe");

    // Click edit button on the node
    await page.click('button:has-text("Edit")');

    // A modal should appear with edit form
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator('h2:has-text("Edit Person")')).toBeVisible();

    // Update the person's information
    await page.fill('input[name="lastName"]', "Doe Updated");

    // Submit the form
    await page.click('button:has-text("Save Changes")');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Tree should refresh and show the updated person
    await expect(page.locator("text=John Doe Updated")).toBeVisible();
  });

  test("User Journey: Add a Relationship Between People", async () => {
    // Navigate to a family tree first
    await page.click("text=Test Family Tree");
    await page.waitForURL("**/family-trees/tree-123");

    // Mock API response for potential relationship targets
    await page.route("**/api/persons**", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          persons: [
            {
              id: "person-4",
              name: "Bob Smith",
              gender: "male",
              birthDate: "1982-03-10",
              familyTreeId: "tree-123",
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            pages: 1,
          },
        }),
      });
    });

    // Mock the API call for adding a relationship
    await page.route("**/api/relationships", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: "new-rel-id",
            person1Id: "person-1",
            person2Id: "person-4",
            type: "SPOUSE",
            familyTreeId: "tree-123",
          }),
        });
      }
    });

    // Mock the tree refresh after adding relationship
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            // Members including both people in the relationship
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-3", "person-4"], // Added new spouse
            },
            {
              id: "person-4",
              name: "Bob Smith",
              gender: "male",
              birthDate: "1982-03-10",
              parentIds: [],
              childIds: [],
              spouseIds: ["person-1"],
            },
            // Other members...
          ],
          relationships: [
            // Existing relationships plus new one
            {
              id: "new-rel-id",
              type: "SPOUSE",
              person1Id: "person-1",
              person2Id: "person-4",
            },
            // Other relationships...
          ],
        }),
      });
    });

    // Click on a person node to select it
    await page.click("text=John Doe");

    // Click connect relationship button
    await page.click('button:has-text("Connect")');

    // A modal should appear with relationship form
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator('h2:has-text("Add Relationship")')).toBeVisible();

    // Select relationship type and target person
    await page.selectOption('select[name="relationshipType"]', "SPOUSE");
    await page.selectOption('select[name="targetPerson"]', {
      label: "Bob Smith",
    });

    // Submit the form
    await page.click('button:has-text("Add Relationship")');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Tree should refresh and show the updated relationship
    // We'd need to check that Bob Smith is visible in the tree
    await expect(page.locator("text=Bob Smith")).toBeVisible();
  });

  test("User Journey: Upload a Photo for a Person", async () => {
    // Navigate to a family tree first
    await page.click("text=Test Family Tree");
    await page.waitForURL("**/family-trees/tree-123");

    // Mock the API call for uploading a photo
    await page.route("**/api/persons/person-1/photo", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: "person-1",
            firstName: "John",
            lastName: "Doe",
            profilePhoto: "/uploads/photos/person-1-photo.jpg",
          }),
        });
      }
    });

    // Mock the tree refresh after updating photo
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              profilePhoto: "/uploads/photos/person-1-photo.jpg", // Added photo
              parentIds: [],
              childIds: ["person-2"],
              spouseIds: ["person-3"],
            },
            // Other members...
          ],
          relationships: [
            // Relationships...
          ],
        }),
      });
    });

    // Click on a person node to select it
    await page.click("text=John Doe");

    // Click edit button
    await page.click('button:has-text("Edit")');

    // A modal should appear with edit form
    await expect(page.locator(".modal")).toBeVisible();

    // Click on photo upload button
    await page.setInputFiles('input[type="file"]', {
      name: "test-photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake image content"),
    });

    // Submit the form
    await page.click('button:has-text("Save Changes")');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Tree should refresh and show the person with photo
    await expect(page.locator(".tree-person-node img")).toBeVisible();
  });

  test("User Journey: Delete a Person", async () => {
    // Navigate to a family tree first
    await page.click("text=Test Family Tree");
    await page.waitForURL("**/family-trees/tree-123");

    // Mock the API call for deleting a person
    await page.route("**/api/persons/person-2", (route) => {
      if (route.request().method() === "DELETE") {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true }),
        });
      }
    });

    // Mock the tree refresh after deleting
    await page.route("**/api/family-trees/tree-123", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "tree-123",
          name: "Test Family Tree",
          ownerId: "user-123",
          members: [
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              parentIds: [],
              childIds: [], // Child removed
              spouseIds: ["person-3"],
            },
            {
              id: "person-3",
              name: "Mary Doe",
              gender: "female",
              birthDate: "1955-10-20",
              parentIds: [],
              childIds: [], // Child removed
              spouseIds: ["person-1"],
            },
            // Person-2 removed
          ],
          relationships: [
            {
              id: "rel-1",
              type: "SPOUSE",
              person1Id: "person-1",
              person2Id: "person-3",
            },
            // Parent-child relationships removed
          ],
        }),
      });
    });

    // Click on the person to delete
    await page.click("text=Jane Doe");

    // Click delete button
    await page.click('button:has-text("Delete")');

    // A confirmation modal should appear
    await expect(page.locator(".modal")).toBeVisible();
    await expect(
      page.locator("text=Are you sure you want to delete")
    ).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Confirm Delete")');

    // Modal should close
    await expect(page.locator(".modal")).not.toBeVisible();

    // Tree should refresh and the deleted person should not be visible
    await expect(page.locator("text=Jane Doe")).not.toBeVisible();
  });

  test("Search for a Person and Navigate to Profile", async () => {
    // Navigate to dashboard
    await page.goto("/dashboard");

    // Mock the search API response
    await page.route("**/api/persons/search**", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          results: [
            {
              id: "person-1",
              name: "John Doe",
              gender: "male",
              birthDate: "1950-01-01",
              familyTreeId: "tree-123",
              treeName: "Test Family Tree",
            },
          ],
        }),
      });
    });

    // Click on search bar
    await page.click('[placeholder="Search people..."]');

    // Type search query
    await page.fill('[placeholder="Search people..."]', "John");

    // Wait for search results
    await expect(page.locator(".search-results-dropdown")).toBeVisible();
    await expect(
      page.locator("text=John Doe (Test Family Tree)")
    ).toBeVisible();

    // Mock the person profile response
    await page.route("**/api/persons/person-1", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: "person-1",
          firstName: "John",
          lastName: "Doe",
          gender: "male",
          birthDate: "1950-01-01",
          familyTreeId: "tree-123",
          profilePhoto: "/path/to/photo.jpg",
          customFields: {
            occupation: "Engineer",
            education: "University",
          },
        }),
      });
    });

    // Mock the relatives API response
    await page.route("**/api/persons/person-1/relatives", (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({
          parents: [],
          children: [
            {
              id: "person-2",
              name: "Jane Doe",
              gender: "female",
              birthDate: "1980-05-15",
            },
          ],
          spouses: [
            {
              id: "person-3",
              name: "Mary Doe",
              gender: "female",
              birthDate: "1955-10-20",
            },
          ],
        }),
      });
    });

    // Click on search result
    await page.click("text=John Doe (Test Family Tree)");

    // Should navigate to person profile
    await page.waitForURL("**/persons/person-1");

    // Profile information should be visible
    await expect(page.locator('h1:has-text("John Doe")')).toBeVisible();
    await expect(page.locator("text=Born: January 1, 1950")).toBeVisible();

    // Relatives should be listed
    await expect(page.locator('h2:has-text("Children")')).toBeVisible();
    await expect(page.locator("text=Jane Doe")).toBeVisible();

    await expect(page.locator('h2:has-text("Spouses")')).toBeVisible();
    await expect(page.locator("text=Mary Doe")).toBeVisible();
  });
});
