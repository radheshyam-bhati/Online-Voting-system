import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter for serverless environments
// Note: For production, consider using Redis-based rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // 1 minute
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as identifier
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  return ip.split(",")[0].trim();
}

export function addRateLimitHeaders(
  response: NextResponse,
  rateLimitResult: { success: boolean; remaining: number; resetTime: number }
): NextResponse {
  response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
  response.headers.set("X-RateLimit-Reset", Math.ceil(rateLimitResult.resetTime / 1000).toString());
  return response;
}