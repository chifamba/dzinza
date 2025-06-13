// Extend Express Request interface to include session properties
declare global {
  namespace Express {
    interface Request {
      sessionID?: string;
    }
  }
}

export {};
