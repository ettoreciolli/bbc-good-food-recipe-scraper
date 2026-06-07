import { neon, NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Lazily-created Neon serverless SQL client. The connection details are taken
 * from the DATABASE_URL environment variable. Like the previous pg pool, the
 * client is created on first use, so importing this module never fails just
 * because the database is unconfigured — a missing or bad connection only
 * surfaces as a rejected promise when a query actually runs.
 */
let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (!client) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    client = neon(connectionString);
  }
  return client;
}

/**
 * Run a parameterized SQL query over HTTP and resolve with the result rows.
 * Wrapping getClient() in a promise means a missing DATABASE_URL becomes a
 * rejection (which callers already handle) rather than a synchronous throw.
 */
export function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  return Promise.resolve().then(
    () => getClient().query(text, params) as Promise<T[]>
  );
}
