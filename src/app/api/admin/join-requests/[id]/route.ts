import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { joinRequest, appUser, membership } = await import("@/db/schema");
  return { joinRequest, appUser, membership };
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

async function hashPassword(password: string): Promise<string> {
  const { hash } = await import("@node-rs/bcrypt");
  return hash(password, 12);
}

const reviewSchema = z.object({
  action: z.enum(["approve", "decline"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const { id } = await params;
  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { joinRequest, appUser, membership } = await getSchema();

  const [requestData] = await db.select().from(joinRequest).where(eq(joinRequest.id, id)).limit(1);
  if (!requestData) {
    return Response.json({ error: "Join request not found" }, { status: 404 });
  }
  if (requestData.status !== "pending") {
    return Response.json({ error: "Request already processed" }, { status: 400 });
  }

  if (parsed.data.action === "approve") {
    const existingUser = await db.select().from(appUser).where(eq(appUser.enrollmentNo, requestData.enrollmentNo)).limit(1);
    if (existingUser[0]) {
      return Response.json({ error: "User with this enrollment number already exists" }, { status: 400 });
    }

    const password = await hashPassword("changeme123");
    const [newUser] = await db
      .insert(appUser)
      .values({
        email: requestData.contactEmail,
        passwordHash: password,
        fullName: requestData.fullName,
        enrollmentNo: requestData.enrollmentNo,
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
    .set({ 
      status: parsed.data.action === "approve" ? "approved" : "declined", 
      reviewedBy: session.user.id, 
      reviewedAt: new Date() 
    })
    .where(eq(joinRequest.id, id));

  return Response.json({ success: true });
}