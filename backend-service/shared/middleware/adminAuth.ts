import { Response, NextFunction } from "express";
// Re-declare the Request type from express to include our custom user property
// This is often done in a global .d.ts file, but can be done here for self-containment.
import { Request as ExpressRequest } from "express";

// Define an interface for the expected structure of req.user after primary authMiddleware
// This should align with what your existing primary authMiddleware populates.
export interface AuthenticatedUserWithRoles {
  id: string;
  email: string;
  role: string;
  roles?: string[]; // Additional roles array for multi-role support
  permissions?: string[];
  name?: string;
}

// Extend Express's Request interface to include our custom 'user' property
// This ensures TypeScript recognizes req.user with our custom type.
export interface RequestWithUser extends ExpressRequest {
  user?: AuthenticatedUserWithRoles;
}

/**
 * Middleware to authorize users based on the 'admin' role.
 * Assumes that a previous authentication middleware (e.g., JWT verification)
 * has successfully authenticated the user and attached a user object to `req.user`,
 * and that this user object includes a `roles` array.
 *
 * @param req - The Express request object, expected to have `req.user` populated.
 * @param res - The Express response object.
 * @param next - The Express next middleware function.
 */
export const adminAuth = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
): void => {
  if (req.user && req.user.roles && req.user.roles.includes("admin")) {
    next(); // User has 'admin' role, proceed to the next handler/middleware
  } else {
    // User is either not authenticated (req.user is undefined),
    // or does not have roles property, or does not include 'admin' role.
    res
      .status(403)
      .json({ message: "Forbidden: Administrator access required." });
  }
};
