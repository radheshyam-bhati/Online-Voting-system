import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { checkAdminPermission } from "@/lib/permissions";

async function getSchema() {
  const { appUser, membership, joinRequest, event, announcement, election } = await import("@/db/schema");
  return { appUser, membership, joinRequest, event, announcement, election };
}

async function checkPermission(requiredFunction: "members" | "content" | "elections" | "admins", targetCampusId?: string | null) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }), session: null, permission: null };
  }

  const permission = await checkAdminPermission(requiredFunction, targetCampusId);
  if (!permission.allowed) {
    return { error: Response.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 }), session, permission };
  }
  return { error: null, session, permission };
}

export async function GET() {
  const { error, session } = await checkPermission("members");
  if (error) return error;

  const db = getDb();
  const { appUser, membership, joinRequest, event, announcement, election } = await getSchema();

  const [totalMembers, pendingRequests, upcomingEvents, publishedAnnouncements, activeElection] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(appUser).where(eq(appUser.isActive, true)),
    db.select({ count: sql<number>`count(*)` }).from(joinRequest).where(eq(joinRequest.status, "pending")),
    db.select({ count: sql<number>`count(*)` }).from(event).where(and(isNull(event.deletedAt), gte(event.startsAt, new Date()))),
    db.select({ count: sql<number>`count(*)` }).from(announcement).where(and(isNull(announcement.deletedAt), eq(announcement.visibility, "public"))),
    db.select({ id: election.id, name: election.name, status: election.status })
      .from(election)
      .where(sql`${election.status} IN ('open', 'scheduled', 'nomination')`)
      .orderBy(desc(election.createdAt))
      .limit(1),
  ]);

  return Response.json({
    totalMembers: totalMembers[0]?.count || 0,
    pendingRequests: pendingRequests[0]?.count || 0,
    upcomingEvents: upcomingEvents[0]?.count || 0,
    publishedAnnouncements: publishedAnnouncements[0]?.count || 0,
    activeElection: activeElection[0] || null,
  });
}