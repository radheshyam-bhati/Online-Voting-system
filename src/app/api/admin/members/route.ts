import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { checkAdminPermission } from "@/lib/permissions";

async function getSchema() {
  const { appUser, membership, joinRequest, event, announcement, election, campus } = await import("@/db/schema");
  return { appUser, membership, joinRequest, event, announcement, election, campus };
}

async function checkPermission(requiredFunction: "members" | "content" | "elections" | "admins", targetCampusId?: string | null) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await checkAdminPermission(requiredFunction, targetCampusId);
  if (!permission.allowed) {
    return Response.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const permissionError = await checkPermission("members");
  if (permissionError) return permissionError;

  const db = getDb();
  const { appUser, membership } = await getSchema();

  const members = await db
    .select({
      id: appUser.id,
      fullName: appUser.fullName,
      email: appUser.email,
      enrollmentNo: appUser.enrollmentNo,
      campusId: appUser.campusId,
      isAdmin: appUser.isAdmin,
      isActive: appUser.isActive,
      createdAt: appUser.createdAt,
      roleTitle: membership.roleTitle,
      displayOrder: membership.displayOrder,
      isPublic: membership.isPublic,
      joinedAt: membership.joinedAt,
    })
    .from(appUser)
    .leftJoin(membership, eq(appUser.id, membership.userId))
    .where(eq(appUser.isActive, true))
    .orderBy(membership.displayOrder, appUser.fullName);

  return Response.json(members);
}