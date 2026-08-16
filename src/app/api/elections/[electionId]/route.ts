import { getDb } from "@/db";
import { eq, sql, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

async function getSchema() {
  const { election, club, candidate, electionVoter } = await import("@/db/schema");
  return { election, club, candidate, electionVoter };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ electionId: string }> }
) {
  const { electionId } = await params;
  const session = await auth();
  
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const { election, club, candidate, electionVoter } = await getSchema();

  const [electionData] = await db
    .select()
    .from(election)
    .where(
      and(
        eq(election.id, electionId),
        sql`${election.status} IN ('nomination', 'scheduled', 'open', 'closed', 'published')`,
        sql`${election.id} IN (SELECT DISTINCT election_id FROM club WHERE election_id = ${election.id})`
      )
    )
    .limit(1);

  if (!electionData) {
    return Response.json({ error: "Election not found" }, { status: 404 });
  }

  // Check if user is eligible to vote in this election
  const eligibility = await db
    .select()
    .from(electionVoter)
    .where(and(eq(electionVoter.electionId, electionId), eq(electionVoter.userId, session.user.id)))
    .limit(1);

  if (!eligibility[0]) {
    return Response.json({ error: "Not eligible" }, { status: 403 });
  }

  const userCampusId = eligibility[0].campusId;
  const clubs = await db
    .select({
      id: club.id,
      name: club.name,
      campusId: club.campusId,
    })
    .from(club)
    .where(and(
      eq(club.electionId, electionId),
      userCampusId ? sql`${club.campusId} IS NULL OR ${club.campusId} = ${userCampusId}` : sql`${club.campusId} IS NULL`
    ));

  const clubsWithCandidates = await Promise.all(clubs.map(async (club) => {
    const candidates = await db
      .select({
        id: candidate.id,
        name: candidate.name,
        publicStatement: candidate.publicStatement,
        photoUrl: candidate.photoUrl,
      })
      .from(candidate)
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, electionId)))
      .orderBy(candidate.createdAt);

    return { ...club, candidates };
  }));

  return Response.json({
    ...electionData,
    clubs: clubsWithCandidates,
  });
}