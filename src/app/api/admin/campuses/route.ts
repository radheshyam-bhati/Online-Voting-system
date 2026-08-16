import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getSchema() {
  const { campus } = await import("@/db/schema");
  return { campus };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { campus } = await getSchema();

  const campuses = await db
    .select({
      id: campus.id,
      name: campus.name,
    })
    .from(campus)
    .where(eq(campus.isActive, true))
    .orderBy(campus.name);

  return Response.json(campuses);
}