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

export async function GET() {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

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

  return Response.json(events);
}

const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  location: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  rsvpEnabled: z.boolean(),
});

export async function POST(request: Request) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  const db = getDb();
  const { event } = await getSchema();

  await db.insert(event).values({
    ...parsed.data,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
    createdBy: session.user.id,
  });

  return Response.json({ success: true });
}