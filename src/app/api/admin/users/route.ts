import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getSchema() {
  const { appUser } = await import("@/db/schema");
  return { appUser };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { appUser } = await getSchema();

  const users = await db
    .select({
      id: appUser.id,
      fullName: appUser.fullName,
      email: appUser.email,
    })
    .from(appUser)
    .where(eq(appUser.isActive, true))
    .orderBy(appUser.fullName);

  return Response.json(users);
}