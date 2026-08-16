"use server";

import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, lte, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { z } from "zod";

async function getSchema() {
  const { 
    election, 
    club, 
    candidate, 
    electionVoter, 
    vote, 
    nominationQuestion, 
    nominationAnswer,
    appUser,
    campus
  } = await import("@/db/schema");
  return { election, club, candidate, electionVoter, vote, nominationQuestion, nominationAnswer, appUser, campus };
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please log in");
  }
  return session.user.id;
}

export async function getElectionDashboard() {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter, vote } = await getSchema();

  // Get elections visible to students: status != 'draft' AND has at least one club
  // For nomination status, clubs can have zero candidates (self-nomination in progress)
  // For scheduled/open/closed/published, clubs must have at least one candidate
  const visibleElections = await db
    .select({
      id: election.id,
      name: election.name,
      status: election.status,
      multiCampus: election.multiCampus,
      startsAt: election.startsAt,
      endsAt: election.endsAt,
      nominationStartsAt: election.nominationStartsAt,
      nominationEndsAt: election.nominationEndsAt,
      resultsVisibility: election.resultsVisibility,
    })
    .from(election)
    .where(
      and(
        sql`${election.status} IN ('nomination', 'scheduled', 'open', 'closed', 'published')`,
        sql`${election.id} IN (SELECT DISTINCT election_id FROM club WHERE election_id = ${election.id})`
      )
    )
    .orderBy(desc(election.createdAt));

  // For each election, get user's voting status per club
  const dashboardData = await Promise.all(visibleElections.map(async (election) => {
    // Get clubs for this election that the user is eligible to vote in
    const userClubs = await db
      .select({
        id: club.id,
        name: club.name,
        campusId: club.campusId,
      })
      .from(club)
      .innerJoin(electionVoter, and(
        eq(electionVoter.electionId, election.id),
        eq(electionVoter.userId, userId),
        sql`${electionVoter.campusId} IS NULL OR ${electionVoter.campusId} = ${club.campusId}`
      ))
      .where(eq(club.electionId, election.id));

    // Get user's votes for this election
    const userVotes = await db
      .select({
        clubId: vote.clubId,
        candidateId: vote.candidateId,
        castAt: vote.castAt,
      })
      .from(vote)
      .where(and(eq(vote.electionId, election.id), eq(vote.studentId, userId)));

    const votedClubIds = new Set(userVotes.map(v => v.clubId));

    // Get candidates for each club
    const clubsWithCandidates = await Promise.all(userClubs.map(async (club) => {
      const candidates = await db
        .select({
          id: candidate.id,
          name: candidate.name,
          statement: candidate.publicStatement,
          photoUrl: candidate.photoUrl,
          statementStatus: candidate.statementStatus,
        })
        .from(candidate)
        .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, election.id)))
        .orderBy(candidate.createdAt);

      const hasVoted = votedClubIds.has(club.id);
      const votedCandidate = hasVoted ? userVotes.find(v => v.clubId === club.id) : null;

      return {
        ...club,
        candidates,
        hasVoted,
        votedCandidateId: votedCandidate?.candidateId || null,
      };
    }));

    // Check if user has nominated themselves for this election
    const userNomination = await db
      .select({ clubId: candidate.clubId })
      .from(candidate)
      .where(and(eq(candidate.electionId, election.id), eq(candidate.nominatedBy, userId), eq(candidate.selfNominated, true)))
      .limit(1);

    return {
      ...election,
      clubs: clubsWithCandidates,
      userNominatedFor: userNomination[0]?.clubId || null,
    };
  }));

  return dashboardData;
}

export async function getElectionForVoting(electionId: string) {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter, vote } = await getSchema();

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
    throw new Error("Election not found or not visible");
  }

  // Check if user is eligible to vote in this election
  const eligibility = await db
    .select()
    .from(electionVoter)
    .where(and(eq(electionVoter.electionId, electionId), eq(electionVoter.userId, userId)))
    .limit(1);

  if (!eligibility[0]) {
    throw new Error("You are not eligible to vote in this election");
  }

  // Check election status
  const now = new Date();
  if (electionData.status !== "open") {
    throw new Error(`Election is not open for voting. Current status: ${electionData.status}`);
  }
  if (electionData.startsAt && new Date(electionData.startsAt) > now) {
    throw new Error("Election has not started yet");
  }
  if (electionData.endsAt && new Date(electionData.endsAt) < now) {
    throw new Error("Election has ended");
  }

  // Get clubs for this election that user is eligible for
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

  // Get candidates for each club
  const clubsWithCandidates = await Promise.all(clubs.map(async (club) => {
    const candidates = await db
      .select({
        id: candidate.id,
        name: candidate.name,
        publicStatement: candidate.publicStatement,
        photoUrl: candidate.photoUrl,
        statementStatus: candidate.statementStatus,
      })
      .from(candidate)
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, electionId)))
      .orderBy(candidate.createdAt);

    return { ...club, candidates };
  }));

  // Get user's existing votes
  const userVotes = await db
    .select({ clubId: vote.clubId, candidateId: vote.candidateId })
    .from(vote)
    .where(and(eq(vote.electionId, electionId), eq(vote.studentId, userId)));

  const votedClubIds = new Set(userVotes.map(v => v.clubId));

  return {
    election: electionData,
    clubs: clubsWithCandidates.map(c => ({
      ...c,
      hasVoted: votedClubIds.has(c.id),
    })),
  };
}

export async function castVote(electionId: string, clubId: string, candidateId: string) {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter, vote } = await getSchema();

  // Verify election is open
  const [electionData] = await db
    .select()
    .from(election)
    .where(eq(election.id, electionId))
    .limit(1);

  if (!electionData || electionData.status !== "open") {
    return { error: "Election is not open for voting" };
  }

  const now = new Date();
  if (electionData.startsAt && new Date(electionData.startsAt) > now) {
    return { error: "Election has not started yet" };
  }
  if (electionData.endsAt && new Date(electionData.endsAt) < now) {
    return { error: "Election has ended" };
  }

  // Verify user eligibility
  const [eligibility] = await db
    .select()
    .from(electionVoter)
    .where(and(eq(electionVoter.electionId, electionId), eq(electionVoter.userId, userId)))
    .limit(1);

  if (!eligibility) {
    return { error: "You are not eligible to vote in this election" };
  }

  // Verify candidate belongs to the club and election
  const [candidateData] = await db
    .select()
    .from(candidate)
    .where(and(eq(candidate.id, candidateId), eq(candidate.clubId, clubId), eq(candidate.electionId, electionId)))
    .limit(1);

  if (!candidateData) {
    return { error: "Invalid candidate" };
  }

  // Check if already voted for this club
  const [existingVote] = await db
    .select()
    .from(vote)
    .where(and(eq(vote.electionId, electionId), eq(vote.studentId, userId), eq(vote.clubId, clubId)))
    .limit(1);

  if (existingVote) {
    return { error: "You have already voted for this club" };
  }

  // Insert vote - the unique constraint will prevent duplicates
  try {
    await db.insert(vote).values({
      electionId,
      clubId,
      studentId: userId,
      candidateId,
    });

    // Audit log
    await db.insert((await import("@/db/schema")).auditLog).values({
      actorId: userId,
      action: "vote_cast",
      targetType: "vote",
      targetId: candidateId,
      metadata: { electionId, clubId },
    });

    revalidatePath(`/elections/${electionId}/vote/${clubId}`);
    revalidatePath("/elections");
    return { success: true };
  } catch (error) {
    // Check if it's a unique constraint violation
    if (error instanceof Error && error.message.includes("uq_one_vote_per_student_per_club")) {
      return { error: "You have already voted for this club" };
    }
    return { error: "Failed to cast vote. Please try again." };
  }
}

export async function getElectionResults(electionId: string) {
  const db = getDb();
  const { election, club, candidate, vote, campus } = await getSchema();

  const session = await auth();
  const isAdmin = session?.user?.isAdmin === true;

  const [electionData] = await db
    .select()
    .from(election)
    .where(
      and(
        eq(election.id, electionId),
        isAdmin ? sql`true` : sql`${election.status} IN ('nomination', 'scheduled', 'open', 'closed', 'published')`,
        isAdmin ? sql`true` : sql`${election.id} IN (SELECT DISTINCT election_id FROM club WHERE election_id = ${election.id})`
      )
    )
    .limit(1);

  if (!electionData) {
    throw new Error("Election not found or not visible");
  }

  // Check if results are published or user is admin
  const canViewResults = electionData.resultsVisibility === "public" || 
    (electionData.resultsVisibility === "members_only" && session?.user?.id) || 
    isAdmin;

  if (!canViewResults) {
    throw new Error("Results are not publicly visible");
  }

  // Get all clubs for this election
  const clubs = await db
    .select({
      id: club.id,
      name: club.name,
      campusId: club.campusId,
    })
    .from(club)
    .where(eq(club.electionId, electionId));

  // Get results for each club
  const results = await Promise.all(clubs.map(async (club) => {
    const candidates = await db
      .select({
        id: candidate.id,
        name: candidate.name,
        publicStatement: candidate.publicStatement,
        photoUrl: candidate.photoUrl,
        voteCount: sql<number>`count(${vote.id})`,
      })
      .from(candidate)
      .leftJoin(vote, and(eq(vote.candidateId, candidate.id), eq(vote.clubId, club.id)))
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, electionId)))
      .groupBy(candidate.id)
      .orderBy(sql`count(${vote.id}) desc`);

    const totalVotes = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);

    // Get campus info if multi-campus
    let campusName = null;
    if (electionData.multiCampus && club.campusId) {
      const [campusData] = await db
        .select({ name: campus.name })
        .from(campus)
        .where(eq(campus.id, club.campusId))
        .limit(1);
      campusName = campusData?.name || null;
    }

    return {
      clubId: club.id,
      clubName: club.name,
      campusName,
      totalVotes,
      candidates,
    };
  }));

  return {
    election: electionData,
    results,
  };
}

export async function getNominationQuestions(clubId: string) {
  const db = getDb();
  const { nominationQuestion } = await getSchema();

  const questions = await db
    .select()
    .from(nominationQuestion)
    .where(eq(nominationQuestion.clubId, clubId))
    .orderBy(nominationQuestion.displayOrder);

  return questions;
}

export async function submitNomination(electionId: string, clubId: string, answers: { questionId: string; answerText: string }[]) {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter, nominationQuestion, nominationAnswer } = await getSchema();

  // Verify election is in nomination period and visible
  const [electionData] = await db
    .select()
    .from(election)
    .where(
      and(
        eq(election.id, electionId),
        sql`${election.status} = 'nomination'`,
        sql`${election.id} IN (SELECT DISTINCT election_id FROM club WHERE election_id = ${election.id})`
      )
    )
    .limit(1);

  if (!electionData) {
    return { error: "Election not found or not visible" };
  }
  if (electionData.status !== "nomination") {
    return { error: "Nominations are not open" };
  }

  const now = new Date();
  if (electionData.nominationStartsAt && new Date(electionData.nominationStartsAt) > now) {
    return { error: "Nomination period has not started yet" };
  }
  if (electionData.nominationEndsAt && new Date(electionData.nominationEndsAt) < now) {
    return { error: "Nomination period has ended" };
  }

  // Verify user eligibility
  const [eligibility] = await db
    .select()
    .from(electionVoter)
    .where(and(eq(electionVoter.electionId, electionId), eq(electionVoter.userId, userId)))
    .limit(1);

  if (!eligibility) {
    return { error: "You are not eligible to nominate in this election" };
  }

  // Check if user already nominated for another club in this election
  const [existingNomination] = await db
    .select()
    .from(candidate)
    .where(and(eq(candidate.electionId, electionId), eq(candidate.nominatedBy, userId), eq(candidate.selfNominated, true)))
    .limit(1);

  if (existingNomination) {
    return { error: `You have already nominated yourself for another club in this election` };
  }

  // Verify club exists and belongs to election
  const [clubData] = await db
    .select()
    .from(club)
    .where(and(eq(club.id, clubId), eq(club.electionId, electionId)))
    .limit(1);

  if (!clubData) {
    return { error: "Invalid club" };
  }

  // Verify all questions are answered
  const questions = await db
    .select({ id: nominationQuestion.id })
    .from(nominationQuestion)
    .where(eq(nominationQuestion.clubId, clubId));

  if (questions.length > 0 && answers.length !== questions.length) {
    return { error: "All nomination questions must be answered" };
  }

  // Create candidate record
  const { appUser } = await import("@/db/schema");
  const [user] = await db
    .select({ fullName: appUser.fullName })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);

  const [newCandidate] = await db
    .insert(candidate)
    .values({
      electionId,
      clubId,
      name: user?.fullName || "Unknown",
      selfNominated: true,
      nominatedBy: userId,
      statementStatus: "pending",
      nominatedAt: new Date(),
    })
    .returning();

  // Save answers
  for (const answer of answers) {
    await db.insert(nominationAnswer).values({
      candidateId: newCandidate.id,
      questionId: answer.questionId,
      answerText: answer.answerText,
    });
  }

  // Audit log
  await db.insert((await import("@/db/schema")).auditLog).values({
    actorId: userId,
    action: "candidate_added",
    targetType: "candidate",
    targetId: newCandidate.id,
    metadata: { electionId, clubId, selfNominated: true },
  });

  revalidatePath("/elections");
  return { success: true, candidateId: newCandidate.id };
}

export async function getAdminElections() {
  await requireAdmin();
  const db = getDb();
  const { election } = await getSchema();

  const elections = await db
    .select()
    .from(election)
    .orderBy(desc(election.createdAt));

  return elections;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user.id;
}

export async function createElection(data: {
  name: string;
  multiCampus: boolean;
  nominationStartsAt?: Date;
  nominationEndsAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  resultsVisibility: "public" | "members_only" | "admin_only";
}) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { election } = await getSchema();

  await db.insert(election).values({
    ...data,
    nominationStartsAt: data.nominationStartsAt || null,
    nominationEndsAt: data.nominationEndsAt || null,
    startsAt: data.startsAt || null,
    endsAt: data.endsAt || null,
    createdBy: adminId,
    status: "draft",
  });

  revalidatePath("/admin/elections");
  return { success: true };
}

// Helper: check if election is visible to students (has clubs)
async function hasClubs(db: ReturnType<typeof getDb>, electionId: string): Promise<boolean> {
  const { club } = await import("@/db/schema");
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(club)
    .where(eq(club.electionId, electionId));
  return (result?.count || 0) > 0;
}

// Helper: check if election is visible to students
export async function isElectionVisibleToStudents(electionId: string): Promise<boolean> {
  const db = getDb();
  const { election } = await import("@/db/schema");
  const [electionData] = await db
    .select({ status: election.status })
    .from(election)
    .where(eq(election.id, electionId))
    .limit(1);

  if (!electionData) return false;
  if (electionData.status === 'draft') return false;
  
  // Check if has at least one club
  const clubsCount = await hasClubs(db, electionId);
  return clubsCount;
}

export async function updateElection(electionId: string, data: Partial<{
  name: string;
  multiCampus: boolean;
  nominationStartsAt: Date | null;
  nominationEndsAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: "draft" | "nomination" | "scheduled" | "open" | "closed" | "published";
  resultsVisibility: "public" | "members_only" | "admin_only";
}>) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { election } = await getSchema();

  // If transitioning to nomination, verify at least one club exists
  if (data.status === 'nomination') {
    const hasClubsResult = await hasClubs(db, electionId);
    if (!hasClubsResult) {
      return { error: "Cannot transition to nomination: election must have at least one club configured" };
    }
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.nominationStartsAt) updateData.nominationStartsAt = new Date(data.nominationStartsAt);
  if (data.nominationEndsAt) updateData.nominationEndsAt = new Date(data.nominationEndsAt);
  if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
  if (data.endsAt) updateData.endsAt = new Date(data.endsAt);

  await db.update(election).set(updateData).where(eq(election.id, electionId));

  revalidatePath("/admin/elections");
  return { success: true };
}