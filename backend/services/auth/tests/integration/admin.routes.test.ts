import request from 'supertest';
import mongoose from 'mongoose';
import { User, IUser } from '../../src/models/User';
import { generateTestToken } from '../utils'; // Test utilities
import app from '../../src/server'; // Express app

describe('Admin Routes - RBAC', () => {
  let adminUser: IUser;
  let regularUser: IUser;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => { // Use beforeAll as user creation can be done once for these tests
    // Create an admin user
    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin', 'user'], // Admin has both roles
      isEmailVerified: true,
    });
    adminToken = generateTestToken(adminUser as any);

    // Create a regular user
    regularUser = await User.create({
      email: 'user@example.com',
      password: 'UserPassword123!',
      firstName: 'Regular',
      lastName: 'User',
      roles: ['user'],
      isEmailVerified: true,
    });
    userToken = generateTestToken(regularUser as any);
  });

  afterAll(async () => {
    // Clean up users after all tests in this suite are done
    // This is important if not clearing DB globally after each test,
    // but jest.setup.ts already clears after each, so this is just for safety/example.
    // await User.deleteMany({ email: { $in: ['admin@example.com', 'user@example.com'] } });
  });

  describe('GET /admin/dashboard', () => {
    it('should allow access for a user with "admin" role', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Welcome to the Admin Dashboard');
    });

    it('should forbid access for a user without "admin" role (e.g., only "user" role)', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access Forbidden: You do not have the required permission.');
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
      const response = await request(app)
        .get('/admin/dashboard');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authorization header is missing or not in Bearer format');
    });

    it('should return 401 Unauthorized if token is invalid', async () => {
      const response = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(response.status).toBe(401); // Or 403 depending on specific error from jwt.verify in middleware
                                         // authenticateToken returns 401 for JsonWebTokenError
      expect(response.body.message).toBe('Invalid access token');
    });
  });
});
