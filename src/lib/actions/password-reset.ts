"use server";

import { getDb } from "@/db";
import { eq, gte } from "drizzle-orm";
import { hashPassword } from "@/lib/auth-utils";
import { v4 as uuidv4 } from "uuid";

async function getSchema() {
  const { appUser, passwordResetToken } = await import("@/db/schema");
  return { appUser, passwordResetToken };
}

/**
 * Request a password reset for a given email.
 * Returns success even if email doesn't exist (to prevent email enumeration).
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  
  const db = getDb();
  const { appUser, passwordResetToken } = await getSchema();

  const [user] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.email, normalizedEmail))
    .limit(1);

  if (!user) {
    // Return success even if user doesn't exist to prevent email enumeration
    return { success: true };
  }

  // Delete any existing reset tokens for this user
  await db
    .delete(passwordResetToken)
    .where(eq(passwordResetToken.userId, user.id));

  // Generate a new reset token
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetToken).values({
    userId: user.id,
    token,
    expiresAt,
  });

  // TODO: Send email with reset link
  // For now, log the token (in production, send via email service)
  console.log(`Password reset token for ${normalizedEmail}: ${token}`);
  console.log(`Reset link: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`);

  return { success: true };
}

/**
 * Reset password using a valid token.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean } | { error: string }> {
  const db = getDb();
  const { appUser, passwordResetToken } = await getSchema();

  // Find the token
  const [resetToken] = await db
    .select()
    .from(passwordResetToken)
    .where(eq(passwordResetToken.token, token))
    .limit(1);

  if (!resetToken) {
    return { error: "Invalid or expired reset token" };
  }

  // Check if token is expired
  if (new Date() > new Date(resetToken.expiresAt)) {
    await db.delete(passwordResetToken).where(eq(passwordResetToken.token, token));
    return { error: "Reset token has expired" };
  }

  // Hash the new password
  const passwordHash = await hashPassword(newPassword);

  // Update user's password
  await db
    .update(appUser)
    .set({ passwordHash })
    .where(eq(appUser.id, resetToken.userId));

  // Delete the used token
  await db.delete(passwordResetToken).where(eq(passwordResetToken.token, token));

  return { success: true };
}