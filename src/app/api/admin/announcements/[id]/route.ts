import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { announcement } = await import("@/db/schema");
  return { announcement };
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
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
  const session = await checkAdmin();
  if (session instanceof Response) return session;

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
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const { id } = await params;

  const db = getDb();
  const { announcement } = await getSchema();

  await db.update(announcement).set({ deletedAt: new Date() }).where(eq(announcement.id, id));

  return Response.json({ success: true });
}