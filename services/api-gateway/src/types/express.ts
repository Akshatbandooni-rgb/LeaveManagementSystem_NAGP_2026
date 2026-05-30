export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
      jwtPayload?: {
        userId: string;
        role: string;
        email: string;
      };
      correlationId?: string;
      outgoingHeaders?: Record<string, string>;
    }
  }
}
