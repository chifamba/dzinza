import request from 'supertest';
// import express from 'express'; // Unused
// import { MongoMemoryServer } from 'mongodb-memory-server'; // Unused due to global setup
import mongoose from 'mongoose'; // Used for mongoose.model if User.hashPassword was actually used, but seems not. Retained for now if other mongoose utils are used.
import { User, IUser } from '../../src/models/User';
import { generateTestToken, TestTokenPayload } from '../utils'; // Test utilities, assuming TestTokenPayload
import nodemailer from 'nodemailer'; // To check if sendMail was called
import app from '../../src/server'; // Import the configured Express app

// Mock nodemailer that's used by the actual email utility
// The mock is already in jest.setup.ts, this is just to get the type for the mock
const mockSendMail = nodemailer.createTransport({}).sendMail as jest.Mock;

// let mongoServer: MongoMemoryServer; // Unused due to global setup via jest.setup.ts

beforeAll(async () => {
  // MongoDB connection is handled by global jest.setup.ts
});

afterEach(async () => {
  // Clear data after each test, also handled by jest.setup.ts
  // const collections = mongoose.connection.collections;
  // for (const key in collections) {
  //   const collection = collections[key];
  //   await collection.deleteMany({});
  // }
  mockSendMail.mockClear(); // Clear mock call counts
});

describe('Auth Routes - Email Verification', () => {
  let testUser: IUser;
  let authToken: string;

  beforeEach(async () => {
    // Create a user directly in the DB for testing
    // Password hashing is handled by the User model's pre-save hook
    testUser = await User.create({
      email: 'verify@example.com',
      password: 'Password123!', // Plain password
      firstName: 'Verify',
      lastName: 'User',
      isEmailVerified: false, // Important for these tests
      roles: ['user'],
    });
    authToken = generateTestToken({ _id: testUser.id, roles: testUser.roles, email: testUser.email } as TestTokenPayload);
  });

  describe('POST /auth/request-verification', () => {
    it('should send a verification email for an unverified user', async () => {
      const response = await request(app)
        .post('/auth/request-verification')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Verification email sent. Please check your inbox.');
      expect(mockSendMail).toHaveBeenCalledTimes(1);

      // Check DB for token (optional, depends on how deep you want to test)
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.emailVerificationToken).toBeDefined();
      expect(updatedUser?.emailVerificationExpires).toBeDefined();
    });

    it('should return 400 if user is already verified', async () => {
      testUser.isEmailVerified = true;
      testUser.emailVerificationToken = undefined; // Clear any existing token
      await testUser.save();

      const response = await request(app)
        .post('/auth/request-verification')
        .set('Authorization', `Bearer ${authToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email is already verified');
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      const response = await request(app)
        .post('/auth/request-verification')
        .send();
      expect(response.status).toBe(401);
    });
  });

  describe('GET /auth/verify-email/:token', () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Generate a token for the user
      verificationToken = testUser.generateEmailVerificationToken();
      await testUser.save();
    });

    it('should verify the user if token is valid', async () => {
      const response = await request(app)
        .get(`/auth/verify-email/${verificationToken}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Email verified successfully. You can now login.');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser?.isEmailVerified).toBe(true);
      expect(updatedUser?.emailVerificationToken).toBeUndefined();
      expect(updatedUser?.emailVerificationExpires).toBeUndefined();
    });

    it('should return 400 if token is invalid', async () => {
      const response = await request(app)
        .get('/auth/verify-email/invalidtoken123')
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification token. Please request a new one.');
    });

    it('should return 400 if token is expired', async () => {
      // Manually expire the token
      testUser.emailVerificationExpires = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      await testUser.save();

      const response = await request(app)
        .get(`/auth/verify-email/${verificationToken}`)
        .send();

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid or expired verification token. Please request a new one.');
    });
  });
});

// Helper to hash password as it's done in User model pre-save hook
// This is a bit of a workaround; ideally, the model itself would expose a static hashPassword method.
// For testing, we need to ensure the password is in the hashed format before creating users directly.
// Or, rely on User.create and provide plain password if pre-save hook is robust.
// The User.create in beforeEach for testUser already handles hashing due to pre-save hook.
// So, direct hashing here might be redundant if User.create is used.
// Let's assume User.create handles it.
// mongoose.model('User').hashPassword = async (password: string) => {
//   const bcrypt = require('bcryptjs');
//   const salt = await bcrypt.genSalt(12);
//   return bcrypt.hash(password, salt);
// };
// This approach of adding method to mongoose.model is not standard.
// It's better to ensure User.create() or user.save() correctly triggers hooks.
// The User model's pre-save hook should handle hashing.
// The test `const password = await mongoose.model('User').hashPassword(...)` is problematic.
// I'll remove it and rely on the model's pre-save hook.
// The User model's pre-save hook is:
// UserSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   try {
//     const salt = await bcrypt.genSalt(12); // BCRYPT_ROUNDS from env or default
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) { next(error as Error); }
// });
// So, when User.create is called with a plain password, it should be hashed.
// The `password` field in `testUser = await User.create(...)` should pass plain text.
// Re-checking the User model: `password: { type: String, required: true, minlength: 8 }`
// The password for `testUser` in `beforeEach` should be plain text.
// `const password = await mongoose.model('User').hashPassword('Password123!');` is incorrect.
// It should be: `password: 'Password123!'` and let the pre-save hook do the work.
// Corrected in the actual test code.
// The `generateTestToken` in `test/utils.ts` takes a user object.
// Let's ensure the user object passed to it is a Mongoose document or has necessary fields.
// `testUser` is a Mongoose document, so `testUser.toObject()` or spreading `...testUser._doc` might be safer if issues arise.
// For now, `testUser as any` is used, which is not ideal but works if `generateTestToken` only needs `_id`, `email`, `roles`.
// `generateTestToken` expects `_id` as string, `email`, `roles`. `testUser._id` is ObjectId.
// So `testUser._id.toString()` should be used.
// `generateTestToken(testUser as any)` should be `generateTestToken({ ...testUser.toObject(), _id: testUser._id.toString() })`
// or modify `generateTestToken` to handle ObjectId.
// The `generateTestToken` in `utils.ts` already does `user._id.toString()`. So it should be fine.

describe('Auth Routes - Logout', () => {
    let testUserLogout: IUser;
    let authTokenLogout: string;

    beforeEach(async () => {
      testUserLogout = await User.create({
        email: 'logout@example.com',
        password: 'Password123!',
        firstName: 'Logout',
        lastName: 'User',
        isEmailVerified: true,
        roles: ['user'],
      });
      authTokenLogout = generateTestToken({ _id: testUserLogout.id, roles: testUserLogout.roles, email: testUserLogout.email } as TestTokenPayload);
    });

    it('POST /auth/logout should succeed for an authenticated user', async () => {
      // For logout, we are not currently revoking specific refresh tokens in this test
      // because the logic in the route for that was noted as needing refinement.
      // This test primarily checks if the authenticated endpoint works.
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authTokenLogout}`)
        .send({ refreshToken: 'dummyRefreshTokenStringForNow' }); // refreshToken might be optional or used for revocation

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout successful');
      // Further assertions could be made if server-side session/token revocation was robustly testable here.
      // e.g., checking if AuditLog was created for logout.
    });

    it('POST /auth/logout should return 401 if not authenticated', async () => {
        const response = await request(app)
          .post('/auth/logout')
          .send();
        expect(response.status).toBe(401);
    });
});
