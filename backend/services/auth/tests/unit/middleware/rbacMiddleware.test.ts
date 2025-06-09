import { Response, NextFunction } from 'express';
import { authorizeRoles } from '../../../src/middleware/rbacMiddleware';
import { AuthenticatedRequest } from '../../../src/middleware/authMiddleware'; // For req.user structure
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('authorizeRoles Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {}; // Will be populated with 'user' object in tests
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call next() if user has one of the allowed roles', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: ['user', 'editor'] };
    const allowedRoles = ['editor', 'admin'];
    const middleware = authorizeRoles(...allowedRoles);

    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(nextFunction).toHaveBeenCalledWith(); // No error
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 if user does not have any of the allowed roles', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: ['user'] };
    const allowedRoles = ['admin', 'editor'];
    const middleware = authorizeRoles(...allowedRoles);

    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      message: `Access Forbidden: You do not have the required permission. Required role(s): ${allowedRoles.join(', ')}.`,
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if user has no roles defined (empty array)', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: [] };
    const allowedRoles = ['admin'];
    const middleware = authorizeRoles(...allowedRoles);

    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
     expect(mockResponse.json).toHaveBeenCalledWith({
      message: `Access Forbidden: You do not have the required permission. Required role(s): ${allowedRoles.join(', ')}.`,
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should return 403 if req.user is not defined', () => {
    // mockRequest.user is undefined by default in this test's beforeEach
    const middleware = authorizeRoles('admin');
    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Forbidden: User roles not available.' });
    expect(nextFunction).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'RBAC: User object or roles not found on request. Ensure authenticateToken runs first.',
      expect.any(Object) // or more specific context
    );
  });

  it('should return 403 if req.user.roles is not defined (e.g. null or undefined)', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: undefined as any }; // Simulate roles being undefined
    const middleware = authorizeRoles('admin');
    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Access Forbidden: User roles not available.' });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should be case-sensitive for role matching (if roles are stored case-sensitively)', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: ['Admin'] }; // User has 'Admin'
    const allowedRoles = ['admin']; // Middleware expects 'admin'
    const middleware = authorizeRoles(...allowedRoles);

    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(403); // Should fail if case-sensitive
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should allow access if user has "admin" role and "admin" is allowed', () => {
    mockRequest.user = { id: '123', email: 'test@example.com', roles: ['admin'] };
    const middleware = authorizeRoles('admin');

    middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });
});
