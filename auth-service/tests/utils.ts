import jwt from 'jsonwebtoken';
import { IUser } from '../src/models/User'; // Assuming IUser is your user interface
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key'; // Use a consistent test secret

/**
 * Generates a JWT for a test user.
 * For integration tests, it's better to use the actual login flow to get tokens.
 * This is a simplified version for direct token generation when needed.
 */
export const generateTestToken = (
  user: Partial<IUser> & { _id: mongoose.Types.ObjectId | string, roles: string[], email: string }
): string => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    roles: user.roles || ['user'],
    sessionId: new mongoose.Types.ObjectId().toString(), // Mock session ID
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
};

/**
 * Creates a mock user object.
 */
export const createMockUser = (userData: Partial<IUser> = {}): Partial<IUser> & { _id: mongoose.Types.ObjectId, roles: string[], email: string, save: jest.Mock } => {
  const defaultUser = {
    _id: new mongoose.Types.ObjectId(),
    email: `test-${new mongoose.Types.ObjectId()}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    isEmailVerified: false,
    roles: ['user'],
    password: 'Password123!', // A valid default password
    authProvider: 'local',
    // Mock Mongoose document methods like save, toObject, etc.
    save: jest.fn().mockResolvedValue(this),
    ...userData,
  };
   // Make sure 'this' in save refers to the object itself.
  const mockUser = { ...defaultUser, save: jest.fn().mockImplementation(() => Promise.resolve(mockUser)) };
  return mockUser;
};
