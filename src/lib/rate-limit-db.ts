"use server";

import { getDb } from "@/db";
import { eq, and, gte, sql } from "drizzle-orm";

async function getSchema() {
  const { rateLimitAttempt } = await import("@/db/schema");
  return { rateLimitAttempt };
}

export async function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const db = getDb();
  const { rateLimitAttempt } = await getSchema();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rateLimitAttempt)
    .where(and(eq(rateLimitAttempt.identifier, identifier), gte(rateLimitAttempt.createdAt, windowStart)))
    .limit(1);

  const count = existing?.count || 0;
  const allowed = count < maxAttempts;
  const remaining = Math.max(0, maxAttempts - count);
  const resetAt = new Date(Date.now() + windowMinutes * 60 * 1000);

  if (allowed) {
    await db.insert(rateLimitAttempt).values({
      identifier,
      createdAt: new Date(),
    });
  }

  return { allowed, remaining, resetAt };
}

export async function cleanupOldRateLimits(windowMinutes: number = 60): Promise<number> {
  const db = getDb();
  const { rateLimitAttempt } = await getSchema();
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);

  const result = await db.delete(rateLimitAttempt).where(sql`${rateLimitAttempt.createdAt} < ${cutoff}`);
  return result.rowCount || 0;
}