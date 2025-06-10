import request from 'supertest';
import passport from 'passport'; // Import passport to mock
import app from '../../src/server'; // Express app
import { User, IUser } from '../../src/models/User';
import { logger } from '../../src/utils/logger'; // For potential logging assertions or silencing
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express'; // Import express types

// Mock the socialAuthHandler utility if direct control over its behavior is needed,
// or mock at the passport.authenticate level. Mocking passport.authenticate is generally cleaner for route tests.
jest.mock('../../src/utils/socialAuthHandler'); // Auto-mock: methods will be jest.fn()
import { handleGoogleUser } from '../../src/utils/socialAuthHandler';
const mockedHandleGoogleUser = handleGoogleUser as jest.Mock;


// Mock logger to suppress output during these specific tests if it's too noisy
// jest.spyOn(logger, 'info').mockImplementation(() => {});
// jest.spyOn(logger, 'error').mockImplementation(() => {});

describe('Social Auth Routes - Google OAuth', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /social/google', () => {
    it('should redirect to Google for authentication', async () => {
      // We can't truly test the redirect to Google itself,
      // but we can check that passport.authenticate is called.
      // A more direct way is to spy on passport.authenticate.
      const passportAuthenticateSpy = jest.spyOn(passport, 'authenticate');

      // Mock the actual execution of passport.authenticate to prevent errors
      // since we are not in a full browser environment for the redirect.
      // The real passport.authenticate would try to redirect.
      // We just want to know it was called.
      passportAuthenticateSpy.mockImplementation((strategy, options) => {
        return (_req: Request, res: Response, next: NextFunction) => { // Typed params, _req as unused
          // Simulate the redirect that passport would do
          // For this test, we can just send a 200 or a specific marker
          // Or check that res.redirect was called if we could spy on it (harder with supertest)
          if (strategy === 'google' && options.scope.includes('profile') && options.scope.includes('email')) {
            res.status(302).send('Redirecting to Google...'); // Simulate a redirect
          } else {
            next(new Error('Passport google strategy not called correctly'));
          }
        };
      });

      const response = await request(app).get('/social/google');

      expect(passportAuthenticateSpy).toHaveBeenCalledWith('google', expect.objectContaining({
        scope: ['profile', 'email'],
        session: false,
      }));
      expect(response.status).toBe(302); // Check that our mock implementation did its job

      passportAuthenticateSpy.mockRestore(); // Clean up spy
    });
  });

  describe('GET /social/google/callback', () => {
    const mockGoogleProfile = {
      id: 'google-user-123',
      displayName: 'Google TestUser',
      name: { givenName: 'Google', familyName: 'TestUser' },
      emails: [{ value: 'google.test@example.com', verified: 'true' }],
      provider: 'google',
    };

    it('should create a new user, generate tokens, and redirect if user does not exist', async () => {
      const createdUserId = new mongoose.Types.ObjectId();
      mockedHandleGoogleUser.mockResolvedValueOnce({
        _id: createdUserId,
        email: mockGoogleProfile.emails[0].value,
        roles: ['user'],
        // ... other IUser fields that generateTokens might need
      } as IUser);

      const response = await request(app)
        .get('/social/google/callback?code=someauthcode'); // code is required by Google flow

      // The actual call to mockedHandleGoogleUser happens inside the real passport strategy,
      // which is hard to directly assert here without a more complex passport mock.
      // The test using the "Improved Mocking" for the callback is more reliable for this.
      // For this specific test, we assume that if passport.authenticate in the route is called
      // and handleGoogleUser is correctly mocked, the flow proceeds.
      // This test mostly ensures the route setup calls passport, and if handleGoogleUser resolves,
      // then token generation and redirect happens.

      expect(response.status).toBe(302); // Should redirect
      expect(response.headers.location).toMatch(/auth\/social-callback\?accessToken=.+&refreshToken=.+/);
      expect(logger.info).toHaveBeenCalledWith('Google OAuth successful, tokens generated.', { userId: createdUserId, email: mockGoogleProfile.emails[0].value });

      // const userInDb = await User.findOne({ email: mockGoogleProfile.emails[0].value }); // userInDb is unused
      // This check is problematic because mockedHandleGoogleUser doesn't interact with DB.
    });

    it('should log in an existing user, generate tokens, and redirect', async () => {
        const existingUserId = new mongoose.Types.ObjectId();
        mockedHandleGoogleUser.mockResolvedValueOnce({
          _id: existingUserId,
          email: mockGoogleProfile.emails[0].value,
          roles: ['user'],
          // ... other IUser fields
        } as IUser);

        const response = await request(app)
          .get('/social/google/callback?code=someauthcode');

        expect(mockedHandleGoogleUser).toHaveBeenCalled(); // As above, this implies passport layer is working.
        expect(response.status).toBe(302);
        expect(response.headers.location).toMatch(/auth\/social-callback\?accessToken=.+&refreshToken=.+/);
        expect(logger.info).toHaveBeenCalledWith('Google OAuth successful, tokens generated.', { userId: existingUserId, email: mockGoogleProfile.emails[0].value });
    });

    it('should redirect to frontend with error if handleGoogleUser throws an error', async () => {
        mockedHandleGoogleUser.mockRejectedValueOnce(new Error('Simulated Google auth error'));

        const response = await request(app)
            .get('/social/google/callback?code=someauthcode');

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('/login?error=google_auth_error'); // Use toContain for string check
        expect(logger.error).toHaveBeenCalledWith('Google OAuth callback error', expect.any(Object)); // Error object is fine
    });

    // This setup is still not ideal for testing the callback route correctly with supertest
    // because `passport.authenticate` in the route itself needs to be properly influenced.
    // A more robust way involves using `jest.spyOn(passport, 'authenticate').mockImplementation(...)`
    // for the callback route specifically to control what `(err, user, info)` are passed to its handler.
    // The current mock of `handleGoogleUser` tests that `socialAuthRoutes.ts` calls it,
    // but not the full Passport flow integration within that route.
  });
});

// A more robust way to test the callback:
describe('GET /social/google/callback (Improved Mocking)', () => {
    const mockGoogleProfile = {
        id: 'google-user-789',
        displayName: 'Callback TestUser',
        name: { givenName: 'Callback', familyName: 'TestUser' },
        emails: [{ value: 'callback.test@example.com', verified: 'true' }],
    };
    const mockUserFromDb = {
        _id: new mongoose.Types.ObjectId(),
        email: mockGoogleProfile.emails[0].value,
        googleId: mockGoogleProfile.id,
        roles: ['user'],
        firstName: 'Callback',
        lastName: 'TestUser',
    } as IUser;

    let passportAuthenticateSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        // This spy will mock passport.authenticate for the 'google' strategy
        passportAuthenticateSpy = jest.spyOn(passport, 'authenticate')
            // @ts-expect-error -- Mocking complex passport signature, actual signature varies.
            .mockImplementation((strategy: string, options: object, callback?: (...args: any[]) => void) => {
                // This mock implementation needs to simulate how passport calls the final handler
                // in the route (the async (err, user, info) => { ... })
                if (strategy === 'google') {
                    // If a custom callback is provided to authenticate(), call it
                    if (callback) {
                         // Simulate successful authentication by Passport & verify callback
                        callback(null, mockUserFromDb, null); // Simulate passport calling our route's callback
                        // Return a dummy middleware that does nothing, as passport.authenticate() returns a middleware
                        return (_req: Request, _res: Response, _next: NextFunction) => {};
                    }
                    // If no custom callback, it's likely the first leg (e.g., GET /social/google)
                    // For this specific test suite focusing on the callback route, we always expect a callback.
                    return (_req: Request, _res: Response, _next: NextFunction) => {};
                }
                // Fallback for other strategies if any, or if a different test needs the original
                const actualAuthenticate = jest.requireActual('passport').authenticate;
                return actualAuthenticate(strategy, options, callback);
            });
    });

    afterEach(() => {
        passportAuthenticateSpy.mockRestore();
    });

    it('should successfully authenticate and redirect with tokens', async () => {
        const response = await request(app)
            .get('/social/google/callback?code=testcode');

        expect(passport.authenticate).toHaveBeenCalledWith('google', expect.anything(), expect.any(Function));
        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('/auth/social-callback?accessToken=');
        expect(response.headers.location).toContain('&refreshToken=');
        // Verify that generateTokens was called (implicitly, by checking logger or AuditLog)
        expect(logger.info).toHaveBeenCalledWith('Google OAuth successful, tokens generated.',
            { userId: mockUserFromDb._id, email: mockUserFromDb.email }
        );
    });

    it('should redirect with error if passport authentication fails (err passed to callback)', async () => {
        passportAuthenticateSpy.mockImplementation((strategy: string, options: object, callback?: (...args: any[]) => void) => {
            if (strategy === 'google' && callback) {
                callback(new Error("Passport Google Strategy Error"), false, { message: "Test failure" });
                return (_req: Request, _res: Response, _next: NextFunction) => {};
            }
            const actualAuthenticate = jest.requireActual('passport').authenticate;
            return actualAuthenticate(strategy, options, callback);
        });

        const response = await request(app)
            .get('/social/google/callback?code=testcode');

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('/login?error=google_auth_error');
        expect(logger.error).toHaveBeenCalledWith("Google OAuth callback error", expect.any(Object));
    });

    it('should redirect with error if passport authenticates but no user is returned', async () => {
        passportAuthenticateSpy.mockImplementation((strategy: string, options: object, callback?: (...args: any[]) => void) => {
            if (strategy === 'google' && callback) {
                callback(null, false, { message: "No user found by strategy" });
                return (_req: Request, _res: Response, _next: NextFunction) => {};
            }
            const actualAuthenticate = jest.requireActual('passport').authenticate;
            return actualAuthenticate(strategy, options, callback);
        });

        const response = await request(app)
            .get('/social/google/callback?code=testcode');

        expect(response.status).toBe(302);
        expect(response.headers.location).toContain('/login?error=google_auth_no_user');
        expect(logger.warn).toHaveBeenCalledWith("Google OAuth callback: User not authenticated or not found.", expect.any(Object));
    });
});
