#!/usr/bin/env node

/**
 * Session Cleanup Script
 * 
 * This script deletes expired sessions from the database.
 * Run as a cron job (e.g., daily) to prevent session table bloat.
 * 
 * Usage: npx tsx scripts/cleanup-sessions.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

async function cleanupSessions() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  console.log("Starting session cleanup...");

  try {
    // Delete expired sessions
    const result = await sql`
      DELETE FROM session 
      WHERE expires_at < NOW()
    `;

    const deletedCount = result.length;
    console.log(`Deleted ${deletedCount} expired sessions`);

    // Also clean up old rate limit attempts (older than 24 hours)
    const rateLimitResult = await sql`
      DELETE FROM rate_limit_attempt 
      WHERE created_at < NOW() - INTERVAL '24 hours'
    `;
    console.log(`Deleted ${rateLimitResult.length} old rate limit attempts`);

    console.log("Session cleanup completed successfully");
  } catch (error) {
    console.error("Session cleanup failed:", error);
    process.exit(1);
  }
}

cleanupSessions();