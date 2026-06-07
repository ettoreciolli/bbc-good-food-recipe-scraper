import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { Request, Response, NextFunction } from "express";

// Neon's serverless Pool talks to Postgres over WebSockets; provide the
// implementation for Node versions that don't have a global WebSocket.
neonConfig.webSocketConstructor = ws;

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

/**
 * Better Auth instance, backed by the same Neon Postgres database the rest of
 * the app uses. Accounts are optional; email + password sign-in is enabled with
 * email verification turned off so accounts work immediately.
 *
 * Requires BETTER_AUTH_SECRET (a long random string) in production; a weak dev
 * fallback keeps local runs from crashing.
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret:
    process.env.BETTER_AUTH_SECRET ||
    "dev-only-insecure-secret-change-me-0123456789",
  baseURL: baseURL,
  trustedOrigins: [baseURL],
});

/** Resolve the Better Auth session for an incoming Express request. */
export function getSession(req: Request) {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
}

/**
 * Express middleware that requires a signed-in user. On success the user's id
 * is stashed on res.locals.userId for the route handler to use.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  getSession(req)
    .then((session) => {
      if (!session || !session.user) {
        res.status(401).send({ error: "Sign in required" });
        return;
      }
      res.locals.userId = session.user.id;
      next();
    })
    .catch((err) => {
      console.error("Auth check failed:", err);
      res.status(500).send({ error: "Auth check failed" });
    });
}
