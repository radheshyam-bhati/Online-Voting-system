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

// Re-export schema
export * from "./schema";