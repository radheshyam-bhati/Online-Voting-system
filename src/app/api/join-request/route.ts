import { getDb } from "@/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { NextResponse } from "next/server";
import { rateLimit, getClientIdentifier, addRateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const joinRequestSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNo: z.string().min(1, "Enrollment number is required"),
  contactEmail: z.string().email("Invalid email address"),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  const clientIp = getClientIdentifier(request as any);
  const rateLimitResult = rateLimit(clientIp, 10, 60 * 1000); // 10 requests per minute
  
  if (!rateLimitResult.success) {
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    return addRateLimitHeaders(response, rateLimitResult);
  }

  const db = getDb();
  const { appUser, joinRequest } = await import("@/db/schema");
  try {
    const formData = await request.formData();
    const rawData = {
      fullName: formData.get("fullName"),
      enrollmentNo: formData.get("enrollmentNo"),
      contactEmail: formData.get("contactEmail"),
      message: formData.get("message"),
    };

    const parsed = joinRequestSchema.safeParse(rawData);
    if (!parsed.success) {
      const response = NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const existingUser = await db
      .select()
      .from(appUser)
      .where(eq(appUser.enrollmentNo, parsed.data.enrollmentNo))
      .limit(1);

    if (existingUser[0]) {
      const response = NextResponse.json(
        { error: "A user with this enrollment number already exists" },
        { status: 409 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    const existingRequest = await db
      .select()
      .from(joinRequest)
      .where(
        and(
          eq(joinRequest.enrollmentNo, parsed.data.enrollmentNo),
          eq(joinRequest.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest[0]) {
      const response = NextResponse.json(
        { error: "A pending request with this enrollment number already exists" },
        { status: 409 }
      );
      return addRateLimitHeaders(response, rateLimitResult);
    }

    await db.insert(joinRequest).values(parsed.data);

    const successResponse = NextResponse.json({ success: true });
    return addRateLimitHeaders(successResponse, rateLimitResult);
  } catch {
    const errorResponse = NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    return addRateLimitHeaders(errorResponse, rateLimitResult);
  }
}