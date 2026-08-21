"use server";

import { getDb } from "@/db";
import { eq, and } from "drizzle-orm";
import { signIn } from "next-auth/react";
import { checkRateLimit } from "@/lib/rate-limit-db";

export async function studentLogin(formData: {
  fullName: string;
  enrollmentNo: string;
  email: string;
}) {
  const { fullName, enrollmentNo, email } = formData;

  // Trim and normalize inputs
  const normalizedFullName = fullName.trim().toLowerCase();
  const normalizedEnrollmentNo = enrollmentNo.trim();
  const normalizedEmail = email.trim().toLowerCase();

  // Check for empty fields
  if (!normalizedFullName || !normalizedEnrollmentNo || !normalizedEmail) {
    return { error: "All three fields are required." };
  }

  // Rate limit by enrollment number (5 attempts per 15 minutes)
  const rateLimit = await checkRateLimit(`student-login:${normalizedEnrollmentNo}`, 5, 15);
  if (!rateLimit.allowed) {
    const minutesLeft = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 60000);
    return { error: `Too many login attempts. Try again in ${minutesLeft} minutes.` };
  }

  const db = getDb();
  const { appUser } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  // Find user by exact enrollment number match
  const [user] = await db
    .select()
    .from(appUser)
    .where(eq(appUser.enrollmentNo, normalizedEnrollmentNo))
    .limit(1);

  // If no user found with this enrollment number
  if (!user) {
    return { error: "These details don't match our records." };
  }

  // Check if account is deactivated
  if (!user.isActive) {
    return { error: "Your account is inactive. Contact the club admin." };
  }

  // Compare full name (case-insensitive, whitespace-trimmed)
  const storedFullName = (user.fullName || "").trim().toLowerCase();
  if (storedFullName !== normalizedFullName) {
    return { error: "These details don't match our records." };
  }

  // Compare email (case-insensitive, exact match)
  const storedEmail = (user.email || "").toLowerCase();
  if (storedEmail !== normalizedEmail) {
    return { error: "These details don't match our records." };
  }

  // All three fields match - create session using NextAuth
  const result = await signIn("credentials", {
    enrollmentNo: user.enrollmentNo,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Failed to create session. Please try again." };
  }

  return { success: true };
}