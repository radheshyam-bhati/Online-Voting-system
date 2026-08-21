"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Require an authenticated session.
 * Throws redirect to login if not authenticated.
 */
export async function requireAuth(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?redirect=" + encodeURIComponent("/elections"));
  }
  return session.user.id;
}

/**
 * Require admin session.
 * Throws redirect to 403 if not admin.
 */
export async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/403");
  }
  return session.user.id;
}

/**
 * Get current session without redirecting.
 * Returns null if not authenticated.
 */
export async function getOptionalSession() {
  const session = await auth();
  return session;
}

/**
 * Get current user ID without redirecting.
 * Returns null if not authenticated.
 */
export async function getOptionalUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}