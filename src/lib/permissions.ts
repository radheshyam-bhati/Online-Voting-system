"use server";

import { getDb } from "@/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getSchema() {
  const { adminGrant, adminPermission, campus } = await import("@/db/schema");
  return { adminGrant, adminPermission, campus };
}

export type AdminFunction = "members" | "content" | "elections" | "admins";

export interface AdminPermissionCheck {
  allowed: boolean;
  isSuperAdmin: boolean;
  grantId?: string;
}

/**
 * Check if a user has admin access for a specific function and optional campus
 */
export async function checkAdminPermission(
  requiredFunction: AdminFunction,
  targetCampusId?: string | null
): Promise<AdminPermissionCheck> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return { allowed: false, isSuperAdmin: false };
  }

  const db = getDb();
  const { adminGrant, adminPermission } = await getSchema();

  // Get active admin grant for user
  const [grant] = await db
    .select({
      id: adminGrant.id,
      isSuperAdmin: adminGrant.isSuperAdmin,
    })
    .from(adminGrant)
    .where(and(eq(adminGrant.userId, userId), isNull(adminGrant.revokedAt)))
    .limit(1);

  if (!grant) {
    return { allowed: false, isSuperAdmin: false };
  }

  // Super admin bypasses all permission checks
  if (grant.isSuperAdmin) {
    return { allowed: true, isSuperAdmin: true, grantId: grant.id };
  }

  // Check if user has the required function permission
  const permission = await db
    .select({ id: adminPermission.id })
    .from(adminPermission)
    .where(
      and(
        eq(adminPermission.adminGrantId, grant.id),
        eq(adminPermission.function, requiredFunction),
        targetCampusId
          ? sql`${adminPermission.campusId} IS NULL OR ${adminPermission.campusId} = ${targetCampusId}`
          : sql`${adminPermission.campusId} IS NULL`
      )
    )
    .limit(1);

  return {
    allowed: permission.length > 0,
    isSuperAdmin: false,
    grantId: grant.id,
  };
}

/**
 * Get all admin permissions for a user (for display in UI)
 */
export async function getAdminPermissions(userId: string) {
  const db = getDb();
  const { adminGrant, adminPermission, campus } = await getSchema();

  const grants = await db
    .select({
      id: adminGrant.id,
      isSuperAdmin: adminGrant.isSuperAdmin,
      grantedAt: adminGrant.grantedAt,
      revokedAt: adminGrant.revokedAt,
      grantedBy: adminGrant.grantedBy,
    })
    .from(adminGrant)
    .where(eq(adminGrant.userId, userId));

  const permissions = await db
    .select({
      grantId: adminPermission.adminGrantId,
      function: adminPermission.function,
      campusId: adminPermission.campusId,
      campusName: campus.name,
    })
    .from(adminPermission)
    .leftJoin(campus, eq(adminPermission.campusId, campus.id))
    .where(
      sql`${adminPermission.adminGrantId} IN (${grants.map(g => g.id).join(",") || "0"})`
    );

  return { grants, permissions };
}

/**
 * Grant admin access to a user
 */
export async function grantAdminAccess(
  targetUserId: string,
  isSuperAdmin: boolean,
  permissions: Array<{ function: AdminFunction; campusId?: string | null }>,
  grantedByUserId: string
) {
  const db = getDb();
  const { adminGrant, adminPermission } = await getSchema();

  // Create admin grant
  const [grant] = await db
    .insert(adminGrant)
    .values({
      userId: targetUserId,
      isSuperAdmin,
      grantedBy: grantedByUserId,
    })
    .returning();

  // Create permissions
  for (const perm of permissions) {
    await db.insert(adminPermission).values({
      adminGrantId: grant.id,
      function: perm.function,
      campusId: perm.campusId || null,
    });
  }

  // Audit log
  await db.insert((await import("@/db/schema")).auditLog).values({
    actorId: grantedByUserId,
    action: "admin_granted",
    targetType: "admin_grant",
    targetId: grant.id,
    metadata: { targetUserId, isSuperAdmin, permissions },
  });

  return { success: true, grantId: grant.id };
}

/**
 * Update admin permissions
 */
export async function updateAdminPermissions(
  grantId: string,
  permissions: Array<{ function: AdminFunction; campusId?: string | null }>,
  updatedByUserId: string
) {
  const db = getDb();
  const { adminPermission } = await getSchema();

  // Delete existing permissions
  await db.delete(adminPermission).where(eq(adminPermission.adminGrantId, grantId));

  // Insert new permissions
  for (const perm of permissions) {
    await db.insert(adminPermission).values({
      adminGrantId: grantId,
      function: perm.function,
      campusId: perm.campusId || null,
    });
  }

  // Audit log
  await db.insert((await import("@/db/schema")).auditLog).values({
    actorId: updatedByUserId,
    action: "admin_permissions_changed",
    targetType: "admin_grant",
    targetId: grantId,
    metadata: { permissions },
  });

  return { success: true };
}

/**
 * Revoke admin access
 */
export async function revokeAdminAccess(grantId: string, revokedByUserId: string) {
  const db = getDb();
  const { adminGrant } = await getSchema();

  // Check if this is the last super admin
  const superAdmins = await db
    .select({ id: adminGrant.id })
    .from(adminGrant)
    .where(and(eq(adminGrant.isSuperAdmin, true), isNull(adminGrant.revokedAt)));

  if (superAdmins.length === 1 && superAdmins[0].id === grantId) {
    return { error: "Cannot revoke the last remaining super admin" };
  }

  await db
    .update(adminGrant)
    .set({ revokedAt: new Date() })
    .where(eq(adminGrant.id, grantId));

  // Audit log
  await db.insert((await import("@/db/schema")).auditLog).values({
    actorId: revokedByUserId,
    action: "admin_revoked",
    targetType: "admin_grant",
    targetId: grantId,
  });

  return { success: true };
}

/**
 * Get all admins with their permissions (for admin UI)
 */
export async function getAllAdmins() {
  const db = getDb();
  const { adminGrant, adminPermission, appUser, campus } = await import("@/db/schema");

  const grants = await db
    .select({
      id: adminGrant.id,
      userId: adminGrant.userId,
      isSuperAdmin: adminGrant.isSuperAdmin,
      grantedAt: adminGrant.grantedAt,
      revokedAt: adminGrant.revokedAt,
      grantedBy: adminGrant.grantedBy,
      userName: appUser.fullName,
      userEmail: appUser.email,
      grantedByName: appUser.fullName,
    })
    .from(adminGrant)
    .leftJoin(appUser, eq(adminGrant.userId, appUser.id))
    .leftJoin(appUser, eq(adminGrant.grantedBy, appUser.id));

  // Get permissions for each grant
  const permissions = await db
    .select({
      grantId: adminPermission.adminGrantId,
      function: adminPermission.function,
      campusId: adminPermission.campusId,
      campusName: campus.name,
    })
    .from(adminPermission)
    .leftJoin(campus, eq(adminPermission.campusId, campus.id));

  return { grants, permissions };
}