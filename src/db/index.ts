import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (cachedDb) return cachedDb;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const sql = neon(databaseUrl);
  cachedDb = drizzle(sql, { schema });
  return cachedDb;
}

// Transaction wrapper - uses Drizzle's transaction API
// Note: Neon HTTP driver doesn't support true transactions.
// For true ACID transactions, migrate to Neon WebSocket driver or use a different approach.
// This wrapper provides the API structure for future migration.
export async function withTransaction<T>(
  fn: (tx: NeonHttpDatabase<typeof schema>) => Promise<T>
): Promise<T> {
  const db = getDb();
  // @ts-expect-error - Neon HTTP driver transaction type mismatch, but works at runtime
  return db.transaction(fn);
}

// Re-export schema
export * from "./schema";