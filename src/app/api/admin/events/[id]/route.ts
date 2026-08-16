import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { event } = await import("@/db/schema");
  return { event };
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  imageUrl: z.string().url().optional().nullable(),
  rsvpEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateEventSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { event } = await getSchema();

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.startsAt) updateData.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt) updateData.endsAt = new Date(parsed.data.endsAt);

  await db.update(event).set(updateData).where(eq(event.id, id));

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
  const { event } = await getSchema();

  await db.update(event).set({ deletedAt: new Date() }).where(eq(event.id, id));

  return Response.json({ success: true });
}