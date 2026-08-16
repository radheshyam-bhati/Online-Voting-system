"use server";

import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { appUser, membership, joinRequest, event, announcement, election, club, candidate, electionVoter, campus } = await import("@/db/schema");
  return { appUser, membership, joinRequest, event, announcement, election, club, candidate, electionVoter, campus };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user.id;
}

export async function getAdminDashboardStats() {
  await requireAdmin();
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

  return {
    totalMembers: totalMembers[0]?.count || 0,
    pendingRequests: pendingRequests[0]?.count || 0,
    upcomingEvents: upcomingEvents[0]?.count || 0,
    publishedAnnouncements: publishedAnnouncements[0]?.count || 0,
    activeElection: activeElection[0] || null,
  };
}

export async function getAdminMembers() {
  await requireAdmin();
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

  return members;
}

export async function updateMemberProfile(memberId: string, data: { roleTitle?: string; displayOrder?: number; isPublic?: boolean; isActive?: boolean }) {
  await requireAdmin();
  const db = getDb();
  const { appUser, membership } = await getSchema();

  if (data.isActive !== undefined) {
    await db.update(appUser).set({ isActive: data.isActive, updatedAt: new Date() }).where(eq(appUser.id, memberId));
  }

  const existingMembership = await db.select().from(membership).where(eq(membership.userId, memberId)).limit(1);
  
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (data.roleTitle !== undefined) updateData.roleTitle = data.roleTitle;
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

  if (existingMembership[0]) {
    await db.update(membership).set(updateData).where(eq(membership.userId, memberId));
  } else if (data.roleTitle || data.displayOrder !== undefined || data.isPublic !== undefined) {
    await db.insert(membership).values({ userId: memberId, ...updateData });
  }

  revalidatePath("/admin/members");
  return { success: true };
}

export async function getJoinRequests() {
  await requireAdmin();
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

  return requests;
}

export async function reviewJoinRequest(requestId: string, action: "approve" | "decline") {
  const adminId = await requireAdmin();
  const db = getDb();
  const { joinRequest, appUser, membership } = await getSchema();

  const [request] = await db.select().from(joinRequest).where(eq(joinRequest.id, requestId)).limit(1);
  if (!request) {
    return { error: "Join request not found" };
  }
  if (request.status !== "pending") {
    return { error: "Request already processed" };
  }

  if (action === "approve") {
    const existingUser = await db.select().from(appUser).where(eq(appUser.enrollmentNo, request.enrollmentNo)).limit(1);
    if (existingUser[0]) {
      return { error: "User with this enrollment number already exists" };
    }

    const password = await hashPassword("changeme123");
    const [newUser] = await db
      .insert(appUser)
      .values({
        email: request.contactEmail,
        passwordHash: password,
        fullName: request.fullName,
        enrollmentNo: request.enrollmentNo,
        isActive: true,
        isAdmin: false,
      })
      .returning();

    await db.insert(membership).values({
      userId: newUser.id,
      roleTitle: null,
      displayOrder: 999,
      isPublic: false,
    });
  }

  await db
    .update(joinRequest)
    .set({ status: action === "approve" ? "approved" : "declined", reviewedBy: adminId, reviewedAt: new Date() })
    .where(eq(joinRequest.id, requestId));

  revalidatePath("/admin/members");
  revalidatePath("/join");
  return { success: true };
}

async function hashPassword(password: string): Promise<string> {
  const { hash } = await import("@node-rs/bcrypt");
  return hash(password, 12);
}

export async function getAdminEvents() {
  await requireAdmin();
  const db = getDb();
  const { event } = await getSchema();

  const events = await db
    .select({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      imageUrl: event.imageUrl,
      rsvpEnabled: event.rsvpEnabled,
      createdAt: event.createdAt,
      deletedAt: event.deletedAt,
    })
    .from(event)
    .orderBy(desc(event.createdAt));

  return events;
}

export async function createEvent(data: { title: string; description: string; location?: string; startsAt: Date; endsAt?: Date; imageUrl?: string; rsvpEnabled: boolean }) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { event } = await getSchema();

  await db.insert(event).values({
    ...data,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    createdBy: adminId,
  });

  revalidatePath("/admin/content");
  revalidatePath("/events");
  return { success: true };
}

export async function updateEvent(eventId: string, data: Partial<{ title: string; description: string; location?: string; startsAt: Date; endsAt?: Date; imageUrl?: string; rsvpEnabled: boolean }>) {
  await requireAdmin();
  const db = getDb();
  const { event } = await getSchema();

  const updateData: Record<string, unknown> = { ...data, updatedAt: new Date() };
  if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
  if (data.endsAt) updateData.endsAt = new Date(data.endsAt);

  await db.update(event).set(updateData).where(eq(event.id, eventId));

  revalidatePath("/admin/content");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function deleteEvent(eventId: string) {
  await requireAdmin();
  const db = getDb();
  const { event } = await getSchema();

  await db.update(event).set({ deletedAt: new Date() }).where(eq(event.id, eventId));

  revalidatePath("/admin/content");
  revalidatePath("/events");
  return { success: true };
}

export async function getAdminAnnouncements() {
  await requireAdmin();
  const db = getDb();
  const { announcement } = await getSchema();

  const announcements = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      visibility: announcement.visibility,
      publishedAt: announcement.publishedAt,
      deletedAt: announcement.deletedAt,
    })
    .from(announcement)
    .orderBy(desc(announcement.publishedAt));

  return announcements;
}

export async function createAnnouncement(data: { title: string; body: string; imageUrl?: string; visibility: "public" | "members_only" }) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { announcement } = await getSchema();

  await db.insert(announcement).values({
    ...data,
    createdBy: adminId,
  });

  revalidatePath("/admin/content");
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function updateAnnouncement(announcementId: string, data: Partial<{ title: string; body: string; imageUrl?: string; visibility: "public" | "members_only" }>) {
  await requireAdmin();
  const db = getDb();
  const { announcement } = await getSchema();

  await db.update(announcement).set({ ...data }).where(eq(announcement.id, announcementId));

  revalidatePath("/admin/content");
  revalidatePath("/announcements");
  revalidatePath("/");
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  await requireAdmin();
  const db = getDb();
  const { announcement } = await getSchema();

  await db.update(announcement).set({ deletedAt: new Date() }).where(eq(announcement.id, announcementId));

  revalidatePath("/admin/content");
  revalidatePath("/announcements");
  return { success: true };
}