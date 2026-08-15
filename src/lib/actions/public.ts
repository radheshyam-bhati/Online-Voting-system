"use server";

import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";

const joinRequestSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNo: z.string().min(1, "Enrollment number is required"),
  contactEmail: z.string().email("Invalid email address"),
  message: z.string().optional(),
});

async function getSchema() {
  const { event, announcement, appUser, membership, joinRequest, eventRsvp } = await import("@/db/schema");
  return { event, announcement, appUser, membership, joinRequest, eventRsvp };
}

export async function getUpcomingEvents(limit = 10) {
  const db = getDb();
  const { event } = await getSchema();
  const now = new Date();
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
    })
    .from(event)
    .where(and(isNull(event.deletedAt), gte(event.startsAt, now)))
    .orderBy(event.startsAt)
    .limit(limit);

  return events;
}

export async function getPastEvents(limit = 10) {
  const db = getDb();
  const { event } = await getSchema();
  const now = new Date();
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
    })
    .from(event)
    .where(and(isNull(event.deletedAt), lte(event.startsAt, now)))
    .orderBy(desc(event.startsAt))
    .limit(limit);

  return events;
}

export async function getEventById(id: string) {
  const db = getDb();
  const { event } = await getSchema();
  const [evt] = await db
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
      createdBy: event.createdBy,
    })
    .from(event)
    .where(and(eq(event.id, id), isNull(event.deletedAt)))
    .limit(1);

  return evt;
}

export async function getEventRsvpCount(eventId: string) {
  const db = getDb();
  const { eventRsvp } = await getSchema();
  const { sql } = await import("drizzle-orm");
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRsvp)
    .where(eq(eventRsvp.eventId, eventId));

  return result[0]?.count || 0;
}

export async function getUserRsvpStatus(eventId: string, userId: string) {
  const db = getDb();
  const { eventRsvp } = await getSchema();
  const [rsvp] = await db
    .select()
    .from(eventRsvp)
    .where(and(eq(eventRsvp.eventId, eventId), eq(eventRsvp.userId, userId)))
    .limit(1);

  return !!rsvp;
}

export async function toggleEventRsvp(eventId: string) {
  const db = getDb();
  const { eventRsvp } = await getSchema();
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Please log in to RSVP" };
  }

  const userId = session.user.id;

  const existing = await db
    .select()
    .from(eventRsvp)
    .where(and(eq(eventRsvp.eventId, eventId), eq(eventRsvp.userId, userId)))
    .limit(1);

  if (existing[0]) {
    await db
      .delete(eventRsvp)
      .where(and(eq(eventRsvp.eventId, eventId), eq(eventRsvp.userId, userId)));
    revalidatePath(`/events/${eventId}`);
    return { success: true, rsvped: false };
  } else {
    await db.insert(eventRsvp).values({ eventId, userId });
    revalidatePath(`/events/${eventId}`);
    return { success: true, rsvped: true };
  }
}

export async function getAnnouncements(visibility?: "public" | "members_only") {
  const db = getDb();
  const { announcement } = await getSchema();
  const whereClause = isNull(announcement.deletedAt);
  const { sql } = await import("drizzle-orm");
  const visibilityFilter = visibility
    ? eq(announcement.visibility, visibility)
    : sql`${announcement.visibility} IN ('public', 'members_only')`;

  const announcements = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      visibility: announcement.visibility,
      publishedAt: announcement.publishedAt,
      createdBy: announcement.createdBy,
    })
    .from(announcement)
    .where(and(whereClause, visibilityFilter))
    .orderBy(desc(announcement.publishedAt));

  return announcements;
}

export async function getLatestAnnouncement() {
  const db = getDb();
  const { announcement } = await getSchema();
  const [ann] = await db
    .select({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      imageUrl: announcement.imageUrl,
      visibility: announcement.visibility,
      publishedAt: announcement.publishedAt,
    })
    .from(announcement)
    .where(
      and(
        isNull(announcement.deletedAt),
        eq(announcement.visibility, "public")
      )
    )
    .orderBy(desc(announcement.publishedAt))
    .limit(1);

  return ann;
}

export async function getPublicMembers() {
  const db = getDb();
  const { appUser, membership } = await getSchema();
  const members = await db
    .select({
      id: appUser.id,
      fullName: appUser.fullName,
      enrollmentNo: appUser.enrollmentNo,
      roleTitle: membership.roleTitle,
      displayOrder: membership.displayOrder,
      isPublic: membership.isPublic,
      joinedAt: membership.joinedAt,
    })
    .from(appUser)
    .innerJoin(membership, eq(appUser.id, membership.userId))
    .where(and(eq(appUser.isActive, true), eq(membership.isPublic, true)))
    .orderBy(membership.displayOrder, appUser.fullName);

  return members;
}

export async function getAllMembers() {
  const db = getDb();
  const { appUser, membership } = await getSchema();
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return [];
  }

  const members = await db
    .select({
      id: appUser.id,
      fullName: appUser.fullName,
      enrollmentNo: appUser.enrollmentNo,
      email: appUser.email,
      roleTitle: membership.roleTitle,
      displayOrder: membership.displayOrder,
      isPublic: membership.isPublic,
      joinedAt: membership.joinedAt,
      isActive: appUser.isActive,
    })
    .from(appUser)
    .leftJoin(membership, eq(appUser.id, membership.userId))
    .where(eq(appUser.isActive, true))
    .orderBy(membership.displayOrder, appUser.fullName);

  return members;
}

export async function submitJoinRequest(formData: FormData) {
  const db = getDb();
  const { appUser, joinRequest } = await getSchema();
  const rawData = {
    fullName: formData.get("fullName"),
    enrollmentNo: formData.get("enrollmentNo"),
    contactEmail: formData.get("contactEmail"),
    message: formData.get("message"),
  };

  const parsed = joinRequestSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existingUser = await db
    .select()
    .from(appUser)
    .where(eq(appUser.enrollmentNo, parsed.data.enrollmentNo))
    .limit(1);

  if (existingUser[0]) {
    return { error: "A user with this enrollment number already exists" };
  }

  const existingRequest = await db
    .select()
    .from(joinRequest)
    .where(
      and(
        eq(joinRequest.enrollmentNo, parsed.data.enrollmentNo),
        eq(joinRequest.status, "pending")
      )
    )
    .limit(1);

  if (existingRequest[0]) {
    return { error: "A pending request with this enrollment number already exists" };
  }

  await db.insert(joinRequest).values(parsed.data);
  revalidatePath("/join");
  revalidatePath("/admin/members");

  return { success: true };
}