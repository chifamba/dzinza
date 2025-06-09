import mongoose from 'mongoose';
import { Profile as GoogleProfile } from 'passport-google-oauth20';
import { handleGoogleUser } from '../../../src/utils/socialAuthHandler';
import { User, IUser } from '../../../src/models/User';
import { logger } from '../../../src/utils/logger';

// Mock the User model
jest.mock('../../../src/models/User');
const MockedUser = User as jest.Mocked<typeof User>;

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Social Auth Handler - handleGoogleUser', () => {
  let mockProfile: GoogleProfile;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProfile = {
      id: 'google123',
      displayName: 'Test User',
      name: { givenName: 'Test', familyName: 'User' },
      emails: [{ value: 'test.user@example.com', verified: 'true' }],
      provider: 'google',
      _raw: '',
      _json: {} as any,
    };
  });

  it('should create a new user if one does not exist', async () => {
    MockedUser.findOne.mockResolvedValue(null); // No existing user
    const mockCreatedUser = {
        _id: new mongoose.Types.ObjectId(),
        email: mockProfile.emails![0].value,
        googleId: mockProfile.id,
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
        authProvider: 'google',
        roles: ['user'],
        save: jest.fn().mockResolvedValueThis(),
    } as unknown as IUser;
    MockedUser.create.mockResolvedValue(mockCreatedUser);

    const user = await handleGoogleUser(mockProfile);

    expect(MockedUser.findOne).toHaveBeenCalledWith({ email: 'test.user@example.com' });
    expect(MockedUser.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test.user@example.com',
      googleId: 'google123',
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      authProvider: 'google',
    }));
    expect(user).toEqual(mockCreatedUser);
    expect(logger.info).toHaveBeenCalledWith('Created new user via Google OAuth', expect.any(Object));
  });

  it('should link Google ID to an existing user if email matches and googleId is not set', async () => {
    const existingUserId = new mongoose.Types.ObjectId();
    const mockExistingUser = {
      _id: existingUserId,
      email: mockProfile.emails![0].value,
      googleId: null, // Not yet linked
      firstName: 'Existing',
      lastName: 'Name',
      isEmailVerified: false,
      authProvider: 'local',
      save: jest.fn().mockImplementation(function(this: IUser) { return Promise.resolve(this); }), // Mock save
    } as unknown as IUser;
    MockedUser.findOne.mockResolvedValue(mockExistingUser);

    const user = await handleGoogleUser(mockProfile);

    expect(MockedUser.findOne).toHaveBeenCalledWith({ email: 'test.user@example.com' });
    expect(MockedUser.create).not.toHaveBeenCalled();
    expect(user.googleId).toBe('google123');
    expect(user.isEmailVerified).toBe(true); // Should be set to true
    expect(user.authProvider).toBe('google'); // Updated authProvider
    expect(mockExistingUser.save).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('Linked Google account to existing user', expect.any(Object));
  });

  it('should return existing user if email and googleId match', async () => {
    const mockExistingUser = {
      _id: new mongoose.Types.ObjectId(),
      email: mockProfile.emails![0].value,
      googleId: mockProfile.id, // Already linked with this Google ID
      firstName: 'Test',
      lastName: 'User',
      isEmailVerified: true,
      authProvider: 'google',
      save: jest.fn().mockResolvedValueThis(),
    } as unknown as IUser;
    MockedUser.findOne.mockResolvedValue(mockExistingUser);

    const user = await handleGoogleUser(mockProfile);

    expect(MockedUser.findOne).toHaveBeenCalledWith({ email: 'test.user@example.com' });
    expect(MockedUser.create).not.toHaveBeenCalled();
    expect(mockExistingUser.save).not.toHaveBeenCalled(); // No save needed if already linked
    expect(user).toEqual(mockExistingUser);
  });

  it('should throw error if email from Google profile is missing', async () => {
    mockProfile.emails = undefined;
    await expect(handleGoogleUser(mockProfile)).rejects.toThrow('No email found in Google profile');
    expect(logger.error).toHaveBeenCalledWith('Google profile did not return email.', { googleId: 'google123' });
  });

  it('should throw error if email exists but is linked to a different Google ID', async () => {
    const mockExistingUserDifferentGoogleId = {
      _id: new mongoose.Types.ObjectId(),
      email: mockProfile.emails![0].value,
      googleId: 'differentGoogleId456', // Linked to another Google account
      firstName: 'Conflict',
      lastName: 'User',
      save: jest.fn().mockResolvedValueThis(),
    } as unknown as IUser;
    MockedUser.findOne.mockResolvedValue(mockExistingUserDifferentGoogleId);

    await expect(handleGoogleUser(mockProfile)).rejects.toThrow('Email is associated with a different Google account.');
    expect(logger.error).toHaveBeenCalledWith(
      'Email conflict: User exists with this email but a different Google ID.',
      expect.objectContaining({ email: mockProfile.emails![0].value })
    );
  });

  // Test case for when User.schema.path('password')?.isRequired is true
  // This requires more complex mocking of the User.schema, or an integration test approach.
  // For this unit test, we assume the User model's conditional password requirement handles it.
  // The User model was updated: `required: function(this: IUser) { return this.authProvider === 'local'; }`
  // So, for 'google' authProvider, password should not be required.
  it('should not attempt to set password if authProvider is google and password is not required', async () => {
    MockedUser.findOne.mockResolvedValue(null);
    const createdUserSpy = jest.fn();
    MockedUser.create.mockImplementation((userDoc: any) => {
        createdUserSpy(userDoc);
        return Promise.resolve({ ...userDoc, _id: new mongoose.Types.ObjectId() } as IUser);
    });

    await handleGoogleUser(mockProfile);

    expect(MockedUser.create).toHaveBeenCalled();
    const createdUserDoc = createdUserSpy.mock.calls[0][0];
    expect(createdUserDoc.password).toBeUndefined();
  });
});
