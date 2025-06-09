import { Request, Response, NextFunction } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../../../src/middleware/authMiddleware';
import jwt from 'jsonwebtoken';
import { logger }
from '../../../src/utils/logger'; // To potentially mock logger methods if needed

// Mock logger to prevent console output during tests and allow assertions
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock jwt.verify
jest.mock('jsonwebtoken');
const mockedJwtVerify = jwt.verify as jest.Mock;

describe('authenticateToken Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  const testSecret = process.env.JWT_SECRET || 'test-secret-key';

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
    // Set the actual JWT_SECRET for the tests if not set, or ensure it's mocked consistently
    process.env.JWT_SECRET = testSecret;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() and attach user to req if token is valid', () => {
    const mockUserPayload = { userId: '123', email: 'test@example.com', roles: ['user'] };
    mockRequest.headers = { authorization: `Bearer validtokenstring` };
    mockedJwtVerify.mockImplementation((token, secret) => {
      if (token === 'validtokenstring' && secret === testSecret) {
        return mockUserPayload;
      }
      throw new Error('Invalid token');
    });

    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockedJwtVerify).toHaveBeenCalledWith('validtokenstring', testSecret);
    expect(mockRequest.user).toEqual(mockUserPayload);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(nextFunction).toHaveBeenCalledWith(); // No error
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 401 if token is missing', () => {
    mockRequest.headers = {}; // No authorization header
    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authorization header is missing or not in Bearer format' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is present but not Bearer', () => {
    mockRequest.headers = { authorization: 'NotBearer validtokenstring' };
    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Authorization header is missing or not in Bearer format' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if Bearer token string is empty', () => {
    mockRequest.headers = { authorization: 'Bearer ' };
    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access token is missing or invalid' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is expired', () => {
    mockRequest.headers = { authorization: 'Bearer expiredtokenstring' };
    mockedJwtVerify.mockImplementation(() => {
      const error = new Error('TokenExpiredError') as any; // Simulate JWT specific error
      error.name = 'TokenExpiredError';
      throw error;
    });

    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access token expired' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 401 if token is invalid (JsonWebTokenError)', () => {
    mockRequest.headers = { authorization: 'Bearer invalidtokenstring' };
    mockedJwtVerify.mockImplementation(() => {
      const error = new Error('JsonWebTokenError') as any;
      error.name = 'JsonWebTokenError';
      throw error;
    });

    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid access token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 for other jwt.verify errors', () => {
    mockRequest.headers = { authorization: 'Bearer othererrorstring' };
    mockedJwtVerify.mockImplementation(() => {
      throw new Error('Some other verification error');
    });

    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Failed to authenticate token' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should correctly assign roles, defaulting to empty array if not in token', () => {
    const mockUserPayloadNoRoles = { userId: '123', email: 'test@example.com' }; // No roles field
    mockRequest.headers = { authorization: `Bearer validtoken_noroles` };
    mockedJwtVerify.mockReturnValue(mockUserPayloadNoRoles);

    authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockRequest.user).toBeDefined();
    expect(mockRequest.user?.roles).toEqual([]);
    expect(nextFunction).toHaveBeenCalledWith();
  });

});
