import { Request, Response, NextFunction } from 'express';
import { adminAuth, RequestWithUser, AuthenticatedUserWithRoles } from './adminAuth'; // Adjust path

describe('Admin Auth Middleware', () => {
  let mockRequest: Partial<RequestWithUser>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should call next() if user is an admin', () => {
    mockRequest.user = { id: 'admin1', roles: ['user', 'admin'] };
    adminAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
    expect(nextFunction).toHaveBeenCalledTimes(1);
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not authenticated (no req.user)', () => {
    // No req.user
    adminAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden: Administrator access required.' });
  });

  it('should return 403 if user has no roles array', () => {
    mockRequest.user = { id: 'user1' } as AuthenticatedUserWithRoles; // roles is undefined
    adminAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden: Administrator access required.' });
  });

  it('should return 403 if user roles array is empty', () => {
    mockRequest.user = { id: 'user1', roles: [] };
    adminAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden: Administrator access required.' });
  });


  it('should return 403 if user does not have "admin" role', () => {
    mockRequest.user = { id: 'user2', roles: ['user', 'editor'] };
    adminAuth(mockRequest as RequestWithUser, mockResponse as Response, nextFunction);
    expect(nextFunction).not.toHaveBeenCalled();
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Forbidden: Administrator access required.' });
  });
});
