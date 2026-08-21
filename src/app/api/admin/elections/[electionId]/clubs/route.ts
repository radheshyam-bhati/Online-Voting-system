import { getDb } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { checkAdminPermission } from "@/lib/permissions";

async function getSchema() {
  const { club, candidate, campus } = await import("@/db/schema");
  return { club, candidate, campus };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  const session = await auth();
  
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await checkAdminPermission("elections");
  if (!permission.allowed) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const { club, candidate, campus } = await getSchema();

  const clubs = await db
    .select({
      id: club.id,
      name: club.name,
      campusId: club.campusId,
    })
    .from(club)
    .where(eq(club.electionId, electionId));

  const clubsWithCandidates = await Promise.all(clubs.map(async (club) => {
    const candidates = await db
      .select({
        id: candidate.id,
        name: candidate.name,
        publicStatement: candidate.publicStatement,
        photoUrl: candidate.photoUrl,
        selfNominated: candidate.selfNominated,
        createdAt: candidate.createdAt,
      })
      .from(candidate)
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, electionId)))
      .orderBy(candidate.createdAt);

    let campusName = null;
    if (club.campusId) {
      const [campusData] = await db
        .select({ name: campus.name })
        .from(campus)
        .where(eq(campus.id, club.campusId))
        .limit(1);
      campusName = campusData?.name || null;
    }

    return { ...club, campusName, candidates };
  }));

  return Response.json(clubsWithCandidates);
}