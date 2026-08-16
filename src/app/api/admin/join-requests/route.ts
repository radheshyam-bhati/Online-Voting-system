import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { checkAdminPermission } from "@/lib/permissions";

async function getSchema() {
  const { joinRequest, appUser } = await import("@/db/schema");
  return { joinRequest, appUser };
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
  const { joinRequest, appUser } = await getSchema();

  const requests = await db
    .select({
      id: joinRequest.id,
      fullName: joinRequest.fullName,
      enrollmentNo: joinRequest.enrollmentNo,
      contactEmail: joinRequest.contactEmail,
      message: joinRequest.message,
      status: joinRequest.status,
      createdAt: joinRequest.createdAt,
      reviewedAt: joinRequest.reviewedAt,
      reviewedBy: joinRequest.reviewedBy,
      reviewerName: appUser.fullName,
    })
    .from(joinRequest)
    .leftJoin(appUser, eq(joinRequest.reviewedBy, appUser.id))
    .orderBy(desc(joinRequest.createdAt));

  return Response.json(requests);
}