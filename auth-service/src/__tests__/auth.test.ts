import { TestHelper } from "./utils/test-helpers";

describe("Auth Service", () => {
  describe("Test Utilities", () => {
    it("should create a test user with default values", async () => {
      const user = await TestHelper.createTestUser();

      expect(user).toBeDefined();
      expect(user.email).toMatch(/test\d+@example\.com/);
      expect(user.firstName).toBe("Test");
      expect(user.lastName).toBe("User");
      expect(user.preferredLanguage).toBe("en");
      expect(user.emailVerified).toBe(true);
    });

    it("should create a test user with custom values", async () => {
      const customUser = await TestHelper.createTestUser({
        email: "custom@example.com",
        firstName: "Custom",
        lastName: "TestUser",
        emailVerified: false,
      });

      expect(customUser.email).toBe("custom@example.com");
      expect(customUser.firstName).toBe("Custom");
      expect(customUser.lastName).toBe("TestUser");
      expect(customUser.emailVerified).toBe(false);
    });

    it("should generate valid auth tokens", () => {
      const userId = "test-user-id";
      const token = TestHelper.generateAuthToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate valid refresh tokens", () => {
      const userId = "test-user-id";
      const refreshToken = TestHelper.generateRefreshToken(userId);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe("string");
      expect(refreshToken.split(".")).toHaveLength(3); // JWT has 3 parts
    });

    it("should generate valid passwords and emails", () => {
      const password = TestHelper.generateValidPassword();
      const email = TestHelper.generateValidEmail();

      expect(password).toMatch(/^TestPassword123!$/);
      expect(email).toMatch(/test\d+@example\.com/);
    });
  });

  describe("Async Utilities", () => {
    it("should wait for condition to be met", async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };

      const result = await TestHelper.waitFor(condition, 1000);
      expect(result).toBe(true);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it("should timeout if condition is not met", async () => {
      const condition = () => false;

      await expect(TestHelper.waitFor(condition, 100)).rejects.toThrow(
        "Condition not met within 100ms"
      );
    });

    it("should delay execution", async () => {
      const start = Date.now();
      await TestHelper.delay(50);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(45); // Allow some margin
    });
  });
});
