import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../models/RefreshToken';
import { logger } from './logger';

export interface TokenPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Generate access and refresh token pair
 */
export const generateTokens = async (
  userId: string, 
  email: string, 
  roles: string[] = ['user'],
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> => {
  try {
    const sessionId = uuidv4();
    
    // Create access token payload
    const accessPayload: TokenPayload = {
      userId,
      email,
      roles,
      sessionId,
    };

    // Generate access token
    const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'dzinza-auth',
      audience: 'dzinza-app',
    });

    // Generate refresh token
    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { userId, sessionId, tokenId: refreshTokenId },
      JWT_REFRESH_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'dzinza-auth',
        audience: 'dzinza-app',
      }
    );

    // Calculate expiry time
    const expiresIn = getTokenExpiryTime(ACCESS_TOKEN_EXPIRY);
    const refreshExpiresAt = new Date(Date.now() + getTokenExpiryTime(REFRESH_TOKEN_EXPIRY) * 1000);

    // Store refresh token in database
    await RefreshToken.create({
      userId,
      token: refreshTokenId,
      expiresAt: refreshExpiresAt,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };

  } catch (error) {
    logger.error('Error generating tokens:', error, { userId });
    throw new Error('Failed to generate tokens');
  }
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'dzinza-auth',
      audience: 'dzinza-app',
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = async (token: string): Promise<{
  userId: string;
  sessionId: string;
  tokenId: string;
}> => {
  try {
    // Verify JWT
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'dzinza-auth',
      audience: 'dzinza-app',
    }) as any;

    // Check if refresh token exists in database and is not revoked
    const refreshToken = await RefreshToken.findOne({
      userId: decoded.userId,
      token: decoded.tokenId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!refreshToken) {
      throw new Error('Refresh token not found or revoked');
    }

    return {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      tokenId: decoded.tokenId,
    };

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    throw error;
  }
};

/**
 * Revoke refresh token
 */
export const revokeRefreshToken = async (tokenId: string, reason: string = 'logout'): Promise<void> => {
  try {
    await RefreshToken.updateOne(
      { token: tokenId },
      { 
        isRevoked: true, 
        revokedAt: new Date(),
        revokedReason: reason,
      }
    );
  } catch (error) {
    logger.error('Error revoking refresh token:', error, { tokenId });
    throw new Error('Failed to revoke token');
  }
};

/**
 * Revoke all refresh tokens for a user
 */
export const revokeAllUserTokens = async (userId: string, reason: string = 'security'): Promise<void> => {
  try {
    await RefreshToken.updateMany(
      { userId, isRevoked: false },
      { 
        isRevoked: true, 
        revokedAt: new Date(),
        revokedReason: reason,
      }
    );
  } catch (error) {
    logger.error('Error revoking all user tokens:', error, { userId });
    throw new Error('Failed to revoke tokens');
  }
};

/**
 * Convert expiry string to seconds
 */
function getTokenExpiryTime(expiry: string): number {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid expiry format');
  }

  const [, value, unit] = match;
  return parseInt(value) * units[unit];
}
