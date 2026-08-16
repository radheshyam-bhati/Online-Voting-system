import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { checkAdminPermission } from "@/lib/permissions";

async function getSchema() {
  const { announcement } = await import("@/db/schema");
  return { announcement };
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

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  visibility: z.enum(["public", "members_only"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await checkPermission("content");
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateAnnouncementSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { announcement } = await getSchema();

  await db.update(announcement).set({ ...parsed.data }).where(eq(announcement.id, id));

  return Response.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await checkPermission("content");
  if (error) return error;

  const { id } = await params;

  const db = getDb();
  const { announcement } = await getSchema();

  await db.update(announcement).set({ deletedAt: new Date() }).where(eq(announcement.id, id));

  return Response.json({ success: true });
}