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

export async function GET() {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

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

  return Response.json(announcements);
}

const createAnnouncementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal("")),
  visibility: z.enum(["public", "members_only"]),
});

export async function POST(request: Request) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const body = await request.json();
  const parsed = createAnnouncementSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { announcement } = await getSchema();

  await db.insert(announcement).values({
    ...parsed.data,
    createdBy: session.user.id,
  });

  return Response.json({ success: true });
}