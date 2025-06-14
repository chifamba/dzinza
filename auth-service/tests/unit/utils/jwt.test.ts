import mongoose from 'mongoose';
import { generateTokens, verifyRefreshToken, revokeRefreshToken, rotateRefreshToken, TokenPayload, TokenPair } from '../../../src/utils/jwt';
import { RefreshToken, IRefreshToken } from '../../../src/models/RefreshToken';
import jwt, { JwtPayload } from 'jsonwebtoken'; // Import JwtPayload

// Mock the RefreshToken model
jest.mock('../../../src/models/RefreshToken');
// Mock parts of the jwt utility itself for some tests
jest.mock('../../../src/utils/jwt', () => {
  const originalJwtUtils = jest.requireActual('../../../src/utils/jwt');
  return {
    ...originalJwtUtils,
    __esModule: true,
    verifyRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    // generateTokens is NOT mocked here, we want to test its actual implementation for some cases
    // rotateRefreshToken will be tested, so we use its actual implementation
  };
});

const mockedRefreshTokenModel = RefreshToken as jest.Mocked<typeof RefreshToken>;
const mockedVerifyRefreshToken = verifyRefreshToken as jest.Mock;
const mockedRevokeRefreshToken = revokeRefreshToken as jest.Mock;

// Use a fixed secret for testing purposes
const TEST_JWT_SECRET = 'test-jwt-secret-for-utils';
const TEST_JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-utils';

describe('JWT Utilities', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const email = 'test@example.com';
  const roles = ['user', 'editor'];
  const ipAddress = '127.0.0.1';
  const userAgent = 'TestAgent/1.0';

  beforeEach(() => {
    // Override process.env for these tests
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = TEST_JWT_REFRESH_SECRET;
    process.env.ACCESS_TOKEN_EXPIRY = '15m';
    process.env.REFRESH_TOKEN_EXPIRY = '7d';

    jest.clearAllMocks();
    // Reset mocks for those part of jwt.ts we are mocking
    mockedVerifyRefreshToken.mockReset();
    mockedRevokeRefreshToken.mockReset();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens successfully', async () => {
      mockedRefreshTokenModel.create.mockResolvedValue({} as IRefreshToken); // Mock DB save

      const tokens: TokenPair = await generateTokens(userId, email, roles, ipAddress, userAgent);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(15 * 60); // 15 minutes in seconds

      // Verify access token structure and payload
      const decodedAccess = jwt.verify(tokens.accessToken, TEST_JWT_SECRET) as TokenPayload;
      expect(decodedAccess.userId).toBe(userId);
      expect(decodedAccess.email).toBe(email);
      expect(decodedAccess.roles).toEqual(expect.arrayContaining(roles));
      expect(decodedAccess.sessionId).toBeDefined();
      expect(decodedAccess.iss).toBe('dzinza-auth');
      expect(decodedAccess.aud).toBe('dzinza-app');

      // Verify refresh token structure and payload
      interface DecodedTestRefreshToken extends JwtPayload {
        userId: string;
        sessionId: string;
        tokenId: string;
      }
      const decodedRefresh = jwt.verify(tokens.refreshToken, TEST_JWT_REFRESH_SECRET) as DecodedTestRefreshToken;
      expect(decodedRefresh.userId).toBe(userId);
      expect(decodedRefresh.sessionId).toBe(decodedAccess.sessionId); // Should match access token's session
      expect(decodedRefresh.tokenId).toBeDefined(); // This is the UUID stored in DB
      expect(decodedRefresh.iss).toBe('dzinza-auth');
      expect(decodedRefresh.aud).toBe('dzinza-app');

      // Check if RefreshToken.create was called
      expect(mockedRefreshTokenModel.create).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        token: decodedRefresh.tokenId,
        ipAddress,
        userAgent,
      }));
    });

    it('should use default role "user" if roles are not provided', async () => {
        mockedRefreshTokenModel.create.mockResolvedValue({} as IRefreshToken);
        const tokens = await generateTokens(userId, email, undefined, ipAddress, userAgent); // roles is undefined
        const decodedAccess = jwt.verify(tokens.accessToken, TEST_JWT_SECRET) as TokenPayload;
        expect(decodedAccess.roles).toEqual(['user']);
    });
  });

  describe('verifyRefreshToken', () => {
    let validRefreshTokenJwt: string;
    let storedTokenId: string;
    let sessionId: string;

    beforeEach(async () => {
      // Generate a sample token pair to get a valid refresh token JWT for tests
      mockedRefreshTokenModel.create.mockResolvedValue({} as IRefreshToken); // Prevent DB write during this setup
      const tokens = await generateTokens(userId, email, roles);
      validRefreshTokenJwt = tokens.refreshToken;

      // Define expected structure for decoded refresh token when using jwt.decode
      interface DecodedRefreshTokenPayload { // Potentially same as DecodedTestRefreshToken or slightly different if decode provides less
        userId: string;
        sessionId: string;
        tokenId: string;
        iat?: number;
        exp?: number;
        iss?: string;
        aud?: string;
      }
      const decodedRefresh = jwt.decode(validRefreshTokenJwt) as DecodedRefreshTokenPayload | null;
      if (!decodedRefresh) throw new Error('Failed to decode refresh token for test setup');
      storedTokenId = decodedRefresh.tokenId;
      sessionId = decodedRefresh.sessionId;
    });

    it('should verify a valid refresh token and return its payload', async () => {
      const mockRefreshTokenDoc = {
        userId,
        token: storedTokenId,
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      } as IRefreshToken;
      mockedRefreshTokenModel.findOne.mockResolvedValue(mockRefreshTokenDoc);

      const result = await verifyRefreshToken(validRefreshTokenJwt);

      expect(result).toEqual({
        userId,
        sessionId,
        tokenId: storedTokenId,
      });
      expect(mockedRefreshTokenModel.findOne).toHaveBeenCalledWith({
        userId,
        token: storedTokenId,
        isRevoked: false,
        expiresAt: { $gt: expect.any(Date) },
      });
    });

    it('should throw an error if refresh token is not found in DB', async () => {
      mockedRefreshTokenModel.findOne.mockResolvedValue(null);
      await expect(verifyRefreshToken(validRefreshTokenJwt)).rejects.toThrow('Refresh token not found or revoked');
    });

    it('should throw an error if refresh token is revoked', async () => {
      const mockRefreshTokenDoc = {
        userId,
        token: storedTokenId,
        isRevoked: true, // Token is revoked
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as IRefreshToken;
      mockedRefreshTokenModel.findOne.mockResolvedValue(mockRefreshTokenDoc);

      await expect(verifyRefreshToken(validRefreshTokenJwt)).rejects.toThrow('Refresh token not found or revoked');
    });

    it('should throw an error if refresh token is expired (based on DB expiresAt)', async () => {
        const mockRefreshTokenDoc = {
            userId,
            token: storedTokenId,
            isRevoked: false,
            expiresAt: new Date(Date.now() - 1000), // Expired
          } as IRefreshToken;
        mockedRefreshTokenModel.findOne.mockResolvedValue(mockRefreshTokenDoc);

        await expect(verifyRefreshToken(validRefreshTokenJwt)).rejects.toThrow('Refresh token not found or revoked');
    });

    it('should throw an error if JWT is invalid (JsonWebTokenError)', async () => {
        const invalidJwt = 'this.is.not.a.valid.jwt';
        await expect(verifyRefreshToken(invalidJwt)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw an error if JWT is expired (TokenExpiredError)', async () => {
        // Create an already expired JWT
        const expiredPayload = { userId, sessionId, tokenId: storedTokenId };
        const expiredToken = jwt.sign(expiredPayload, TEST_JWT_REFRESH_SECRET, { expiresIn: '0s' });
        // Need to wait a tiny bit for it to actually be expired
        await new Promise(r => setTimeout(r, 50));

        await expect(verifyRefreshToken(expiredToken)).rejects.toThrow('Refresh token expired');
    });
  });

  describe('rotateRefreshToken', () => {
    const oldRefreshTokenString = 'dummy-old-refresh-token';
    const oldTokenId = 'old-token-id';
    const oldSessionId = 'old-session-id';

    const mockVerifiedOldToken = {
      userId,
      sessionId: oldSessionId,
      tokenId: oldTokenId,
    };

    beforeEach(() => {
      // Reset specific mocks for jwt utils before each test in this block
      mockedVerifyRefreshToken.mockReset();
      mockedRevokeRefreshToken.mockReset();
      mockedRefreshTokenModel.create.mockReset(); // Reset DB mock
    });

    it('should successfully rotate a refresh token', async () => {
      // 1. Setup mocks
      mockedVerifyRefreshToken.mockResolvedValue(mockVerifiedOldToken);
      mockedRevokeRefreshToken.mockResolvedValue(undefined); // Simulate successful revocation
      mockedRefreshTokenModel.create.mockResolvedValue({} as IRefreshToken); // Simulate successful DB save of new token

      // 2. Call the function
      const newTokens: TokenPair = await rotateRefreshToken(
        oldRefreshTokenString,
        email,
        roles,
        ipAddress,
        userAgent
      );

      // 3. Assertions
      expect(mockedVerifyRefreshToken).toHaveBeenCalledWith(oldRefreshTokenString);
      expect(mockedRevokeRefreshToken).toHaveBeenCalledWith(oldTokenId, 'rotated');

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.expiresIn).toBe(15 * 60);

      // Verify new access token payload
      const decodedAccess = jwt.verify(newTokens.accessToken, TEST_JWT_SECRET) as TokenPayload;
      expect(decodedAccess.userId).toBe(userId);
      expect(decodedAccess.email).toBe(email);
      expect(decodedAccess.roles).toEqual(expect.arrayContaining(roles));
      expect(decodedAccess.sessionId).toBe(oldSessionId); // SessionId should be preserved from old token
      expect(decodedAccess.iss).toBe('dzinza-auth');
      expect(decodedAccess.aud).toBe('dzinza-app');

      // Verify new refresh token payload
      interface DecodedTestRefreshToken extends JwtPayload {
        userId: string;
        sessionId: string;
        tokenId: string;
      }
      const decodedRefresh = jwt.verify(newTokens.refreshToken, TEST_JWT_REFRESH_SECRET) as DecodedTestRefreshToken;
      expect(decodedRefresh.userId).toBe(userId);
      expect(decodedRefresh.sessionId).toBe(oldSessionId); // SessionId preserved
      expect(decodedRefresh.tokenId).toBeDefined();
      expect(decodedRefresh.tokenId).not.toBe(oldTokenId); // New token ID must be different
      expect(decodedRefresh.iss).toBe('dzinza-auth');
      expect(decodedRefresh.aud).toBe('dzinza-app');

      // Check if new refresh token was "stored"
      expect(mockedRefreshTokenModel.create).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        token: decodedRefresh.tokenId, // The new token ID
        expiresAt: expect.any(Date),
        ipAddress,
        userAgent,
      }));
    });

    it('should throw an error if old refresh token verification fails', async () => {
      mockedVerifyRefreshToken.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(
        rotateRefreshToken(oldRefreshTokenString, email, roles, ipAddress, userAgent)
      ).rejects.toThrow('Failed to rotate refresh token: Invalid refresh token');

      expect(mockedRevokeRefreshToken).not.toHaveBeenCalled();
      expect(mockedRefreshTokenModel.create).not.toHaveBeenCalled();
    });

    it('should throw an error if revoking old token fails', async () => {
      mockedVerifyRefreshToken.mockResolvedValue(mockVerifiedOldToken);
      mockedRevokeRefreshToken.mockRejectedValue(new Error('DB error during revoke'));

      await expect(
        rotateRefreshToken(oldRefreshTokenString, email, roles, ipAddress, userAgent)
      ).rejects.toThrow('Failed to rotate refresh token'); // General error because the specific error message is not one of the handled ones

      expect(mockedRevokeRefreshToken).toHaveBeenCalledWith(oldTokenId, 'rotated');
      expect(mockedRefreshTokenModel.create).not.toHaveBeenCalled(); // Should not proceed to create new token
    });

    it('should throw an error if storing new refresh token fails', async () => {
        mockedVerifyRefreshToken.mockResolvedValue(mockVerifiedOldToken);
        mockedRevokeRefreshToken.mockResolvedValue(undefined);
        mockedRefreshTokenModel.create.mockRejectedValue(new Error('DB error during create'));

        await expect(
            rotateRefreshToken(oldRefreshTokenString, email, roles, ipAddress, userAgent)
        ).rejects.toThrow('Failed to rotate refresh token');

        expect(mockedRevokeRefreshToken).toHaveBeenCalledWith(oldTokenId, 'rotated');
        // Potentially, the old token is revoked, but new one isn't created. This is a state to be aware of.
    });
  });
});
