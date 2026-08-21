import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const db = getDb();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - startTime;

    // Check if database is responsive
    const isHealthy = dbLatency < 5000; // 5 second threshold

    return Response.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: isHealthy ? "healthy" : "degraded",
            latencyMs: dbLatency,
          },
        },
        version: process.env.npm_package_version || "unknown",
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (error) {
    const latency = Date.now() - startTime;
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: "unhealthy",
            latencyMs: latency,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
        version: process.env.npm_package_version || "unknown",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}