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

// Rate limit by both IP and enrollment number (dual protection)
export function rateLimitDual(
  ip: string,
  enrollmentNo: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 1000 // 1 minute
): { success: boolean; remaining: number; resetTime: number; limitType: "ip" | "enrollment" | "none" } {
  const now = Date.now();
  
  // Check IP rate limit
  const ipRecord = rateLimitMap.get(`ip:${ip}`);
  if (!ipRecord || Date.now() > ipRecord.resetTime) {
    rateLimitMap.set(`ip:${ip}`, { count: 1, resetTime: now + windowMs });
  } else if (ipRecord.count >= 5) {
    return { success: false, remaining: 0, resetTime: ipRecord.resetTime, limitType: "ip" };
  }
  
  // Check enrollment number rate limit
  const enrollmentRecord = rateLimitMap.get(`enrollment:${enrollmentNo.toLowerCase()}`);
  if (!enrollmentRecord || Date.now() > enrollmentRecord.resetTime) {
    rateLimitMap.set(`enrollment:${enrollmentNo.toLowerCase()}`, { count: 1, resetTime: now + windowMs });
  } else if (enrollmentRecord.count >= 5) {
    return { success: false, remaining: 0, resetTime: enrollmentRecord.resetTime, limitType: "enrollment" };
  }
  
  // Increment both counters
  rateLimitMap.set(`ip:${ip}`, { count: (rateLimitMap.get(`ip:${ip}`)?.count || 0) + 1, resetTime: now + windowMs });
  rateLimitMap.set(`enrollment:${enrollmentNo.toLowerCase()}`, { count: (rateLimitMap.get(`enrollment:${enrollmentNo.toLowerCase()}`)?.count || 0) + 1, resetTime: now + windowMs });
  
  return { success: true, remaining: 5, resetTime: now + windowMs, limitType: "none" };
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