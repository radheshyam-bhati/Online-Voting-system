import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { appUser, membership, joinRequest } = await import("@/db/schema");
  return { appUser, membership, joinRequest };
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

const updateMemberSchema = z.object({
  roleTitle: z.string().optional(),
  displayOrder: z.number().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateMemberSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { appUser, membership } = await getSchema();

  if (parsed.data.isActive !== undefined) {
    await db.update(appUser).set({ isActive: parsed.data.isActive, updatedAt: new Date() }).where(eq(appUser.id, id));
  }

  const existingMembership = await db.select().from(membership).where(eq(membership.userId, id)).limit(1);
  
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.roleTitle !== undefined) updateData.roleTitle = parsed.data.roleTitle;
  if (parsed.data.displayOrder !== undefined) updateData.displayOrder = parsed.data.displayOrder;
  if (parsed.data.isPublic !== undefined) updateData.isPublic = parsed.data.isPublic;

  if (existingMembership[0]) {
    await db.update(membership).set(updateData).where(eq(membership.userId, id));
  } else if (Object.keys(updateData).length > 1) { // more than just updatedAt
    await db.insert(membership).values({ userId: id, ...updateData });
  }

  return Response.json({ success: true });
}