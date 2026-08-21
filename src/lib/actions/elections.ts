"use server";

import { getDb } from "@/db";
import { eq, desc, and, isNull, gte, lte, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isCandidateProfileVisible } from "@/lib/candidate-visibility";
import { requireAuth, requireAdmin, getOptionalSession } from "@/lib/auth-server";

async function getSchema() {
  const { 
    election, 
    club, 
    candidate, 
    electionVoter, 
    vote, 
    voteInvalidation,
    nominationQuestion, 
    nominationAnswer,
    appUser,
    campus,
    auditLog
  } = await import("@/db/schema");
  return { election, club, candidate, electionVoter, vote, voteInvalidation, nominationQuestion, nominationAnswer, appUser, campus, auditLog };
}

export async function getElectionDashboard() {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter, vote } = await getSchema();

  // Get elections visible to students: status != 'draft' AND status != 'voided' AND has at least one club
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

  if (visibleElections.length === 0) {
    return [];
  }

  const electionIds = visibleElections.map(e => e.id);

  // Get all clubs for these elections with voter eligibility in one query
  const allClubs = await db
    .select({
      id: club.id,
      name: club.name,
      campusId: club.campusId,
      electionId: club.electionId,
    })
    .from(club)
    .innerJoin(electionVoter, and(
      eq(electionVoter.electionId, club.electionId),
      eq(electionVoter.userId, userId),
      sql`${electionVoter.campusId} IS NULL OR ${electionVoter.campusId} = ${club.campusId}`
    ))
    .where(inArray(club.electionId, electionIds));

  // Get all user votes for these elections in one query
  const allUserVotes = await db
    .select({
      clubId: vote.clubId,
      candidateId: vote.candidateId,
      castAt: vote.castAt,
      electionId: vote.electionId,
    })
    .from(vote)
    .where(and(inArray(vote.electionId, electionIds), eq(vote.studentId, userId)));

  // Get all candidates for these elections in one query
  const allCandidates = await db
    .select({
      id: candidate.id,
      name: candidate.name,
      publicStatement: candidate.publicStatement,
      photoUrl: candidate.photoUrl,
      clubId: candidate.clubId,
      electionId: candidate.electionId,
    })
    .from(candidate)
    .where(inArray(candidate.electionId, electionIds))
    .orderBy(candidate.createdAt);

  // Get user nominations for these elections in one query
  const allUserNominations = await db
    .select({ clubId: candidate.clubId, electionId: candidate.electionId })
    .from(candidate)
    .where(and(inArray(candidate.electionId, electionIds), eq(candidate.nominatedBy, userId), eq(candidate.selfNominated, true)));

  // Group data by election
  const clubsByElection = new Map<string, typeof allClubs>();
  for (const c of allClubs) {
    if (!clubsByElection.has(c.electionId)) clubsByElection.set(c.electionId, []);
    clubsByElection.get(c.electionId)!.push(c);
  }

  const votesByElection = new Map<string, typeof allUserVotes>();
  for (const v of allUserVotes) {
    if (!votesByElection.has(v.electionId)) votesByElection.set(v.electionId, []);
    votesByElection.get(v.electionId)!.push(v);
  }

  const candidatesByClub = new Map<string, typeof allCandidates>();
  for (const c of allCandidates) {
    const key = `${c.electionId}:${c.clubId}`;
    if (!candidatesByClub.has(key)) candidatesByClub.set(key, []);
    candidatesByClub.get(key)!.push(c);
  }

  const nominationsByElection = new Map<string, string | null>();
  for (const n of allUserNominations) {
    nominationsByElection.set(n.electionId, n.clubId);
  }

  // Build dashboard data
  const dashboardData = visibleElections.map((election) => {
    const userClubs = clubsByElection.get(election.id) || [];
    const userVotes = votesByElection.get(election.id) || [];
    const votedClubIds = new Set(userVotes.map(v => v.clubId));

    const clubsWithCandidates = userClubs.map((club) => {
      const key = `${election.id}:${club.id}`;
      const candidates = candidatesByClub.get(key) || [];
      const profileVisible = isCandidateProfileVisible(election.status);
      const hasVoted = votedClubIds.has(club.id);
      const votedCandidate = hasVoted ? userVotes.find(v => v.clubId === club.id) : null;

      return {
        ...club,
        candidates: candidates.map(c => ({
          id: c.id,
          name: c.name,
          statement: c.publicStatement,
          photoUrl: c.photoUrl,
          profileVisible,
        })),
        hasVoted,
        votedCandidateId: votedCandidate?.candidateId || null,
      };
    });

    return {
      ...election,
      clubs: clubsWithCandidates,
      userNominatedFor: nominationsByElection.get(election.id) || null,
    };
  });

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
        sql`${election.status} IN ('nomination', 'scheduled', 'open', 'closed', 'published', 'voided')`,
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
        profileVisible: sql`${isCandidateProfileVisible(electionData.status)}`,
      })
      .from(candidate)
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, election.id)))
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

export async function getElectionForNomination(electionId: string) {
  const userId = await requireAuth();
  const db = getDb();
  const { election, club, candidate, electionVoter } = await getSchema();

  const [electionData] = await db
    .select()
    .from(election)
    .where(
      and(
        eq(election.id, electionId),
        sql`${election.status} IN ('nomination', 'scheduled', 'open', 'closed', 'published', 'voided')`,
        sql`${election.id} IN (SELECT DISTINCT election_id FROM club WHERE election_id = ${election.id})`
      )
    )
    .limit(1);

  if (!electionData) {
    throw new Error("Election not found or not visible");
  }

  // Check if user is eligible to nominate in this election
  const eligibility = await db
    .select()
    .from(electionVoter)
    .where(and(eq(electionVoter.electionId, electionId), eq(electionVoter.userId, userId)))
    .limit(1);

  if (!eligibility[0]) {
    throw new Error("You are not eligible to nominate in this election");
  }

  // Check election status
  const now = new Date();
  if (electionData.status !== "nomination") {
    throw new Error(`Election is not open for nominations. Current status: ${electionData.status}`);
  }
  if (electionData.nominationStartsAt && new Date(electionData.nominationStartsAt) > now) {
    throw new Error("Nomination period has not started yet");
  }
  if (electionData.nominationEndsAt && new Date(electionData.nominationEndsAt) < now) {
    throw new Error("Nomination period has ended");
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
        profileVisible: sql`${isCandidateProfileVisible(electionData.status)}`,
      })
      .from(candidate)
      .where(and(eq(candidate.clubId, club.id), eq(candidate.electionId, election.id)))
      .orderBy(candidate.createdAt);

    return { ...club, candidates };
  }));

  return {
    election: electionData,
    clubs: clubsWithCandidates,
  };
}

export async function castVote(electionId: string, clubId: string, candidateId: string) {
  // CSRF protection (skip in test environment)
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    const { validateCSRF } = await import("@/lib/csrf");
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const request = new Request("", { headers: headersList });
    const isValidCSRF = await validateCSRF(request);
    if (!isValidCSRF) {
      return { error: "Invalid request. Please try again." };
    }
  }

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

    // Audit log - record participation fact only, never vote content (candidate choice)
    await db.insert((await import("@/db/schema")).auditLog).values({
      actorId: userId,
      action: "vote_cast",
      targetType: "vote",
      targetId: null,
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
  const { election, club, candidate, vote, campus, voteInvalidation } = await getSchema();

  const session = await getOptionalSession();
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

  if (clubs.length === 0) {
    return { election: electionData, results: [] };
  }

  const clubIds = clubs.map(c => c.id);
  const campusIds = clubs.filter(c => c.campusId).map(c => c.campusId!) as string[];

  // Get all candidates with vote counts in one query
  const allCandidates = await db
    .select({
      id: candidate.id,
      name: candidate.name,
      publicStatement: candidate.publicStatement,
      photoUrl: candidate.photoUrl,
      clubId: candidate.clubId,
      voteCount: sql<number>`count(${vote.id})`,
    })
    .from(candidate)
    .leftJoin(
      vote,
      and(
        eq(vote.candidateId, candidate.id),
        eq(vote.clubId, candidate.clubId),
        // Exclude invalidated votes: only join votes that are NOT in vote_invalidation
        sql`${vote.id} NOT IN (SELECT vote_id FROM ${voteInvalidation})`
      )
    )
    .where(and(inArray(candidate.clubId, clubIds), eq(candidate.electionId, electionId)))
    .groupBy(candidate.id, candidate.clubId)
    .orderBy(candidate.clubId, sql`count(${vote.id}) desc`);

  // Get campus names in one query if multi-campus
  const campusNames = new Map<string, string>();
  if (electionData.multiCampus && campusIds.length > 0) {
    const campuses = await db
      .select({ id: campus.id, name: campus.name })
      .from(campus)
      .where(inArray(campus.id, campusIds));
    for (const c of campuses) {
      campusNames.set(c.id, c.name);
    }
  }

  // Group candidates by club
  const candidatesByClub = new Map<string, typeof allCandidates>();
  for (const c of allCandidates) {
    if (!candidatesByClub.has(c.clubId)) candidatesByClub.set(c.clubId, []);
    candidatesByClub.get(c.clubId)!.push(c);
  }

  const profileVisible = isCandidateProfileVisible(electionData.status);

  // Build results
  const results = clubs.map((club) => {
    const candidates = candidatesByClub.get(club.id) || [];
    const totalVotes = candidates.reduce((sum, c) => sum + (c.voteCount || 0), 0);

    // Detect tie: check if multiple candidates have the same highest vote count
    const maxVotes = candidates.length > 0 ? (candidates[0].voteCount || 0) : 0;
    const tiedCandidates = candidates.filter(c => (c.voteCount || 0) === maxVotes && maxVotes > 0);
    const isTied = tiedCandidates.length > 1;
    const tieBreakPolicy = electionData.tieBreakPolicy || "manual_review";

    // Get campus name
    let campusName = null;
    if (electionData.multiCampus && club.campusId) {
      campusName = campusNames.get(club.campusId) || null;
    }

    return {
      clubId: club.id,
      clubName: club.name,
      campusName,
      totalVotes,
      candidates: candidates.map(c => ({
        id: c.id,
        name: c.name,
        publicStatement: c.publicStatement,
        photoUrl: c.photoUrl,
        voteCount: c.voteCount || 0,
        profileVisible,
      })),
      isTied,
      tiedCandidates: tiedCandidates.map(c => c.id),
      tieBreakPolicy,
    };
  });

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

export async function submitNomination(electionId: string, clubId: string, answers: { questionId: string; answerText: string }[], photoUrl?: string): Promise<{ success: boolean; candidateId?: string } | { error: string }> {
  // CSRF protection (skip in test environment)
  if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    const { validateCSRF } = await import("@/lib/csrf");
    const { headers } = await import("next/headers");
    const headersList = await headers();
    const request = new Request("", { headers: headersList });
    const isValidCSRF = await validateCSRF(request);
    if (!isValidCSRF) {
      return { error: "Invalid request. Please try again." };
    }
  }

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

  // Create candidate record and answers atomically
  const { appUser } = await import("@/db/schema");
  const [user] = await db
    .select({ fullName: appUser.fullName })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);

  const { withTransaction } = await import("@/db");
  const result = await withTransaction(async (tx) => {
    const [newCandidate] = await tx
      .insert(candidate)
      .values({
        electionId,
        clubId,
        name: user?.fullName || "Unknown",
        selfNominated: true,
        nominatedBy: userId,
        photoUrl: photoUrl || null,
        nominatedAt: new Date(),
      })
      .returning();

    // Save answers
    for (const answer of answers) {
      await tx.insert(nominationAnswer).values({
        candidateId: newCandidate.id,
        questionId: answer.questionId,
        answerText: answer.answerText,
      });
    }

    // Audit log
    await tx.insert((await import("@/db/schema")).auditLog).values({
      actorId: userId,
      action: "candidate_added",
      targetType: "candidate",
      targetId: newCandidate.id,
      metadata: { electionId, clubId, selfNominated: true },
    });

    revalidatePath("/elections");
    return { success: true, candidateId: newCandidate.id };
  });
  return result;
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

export async function createElection(data: {
  name: string;
  multiCampus: boolean;
  nominationStartsAt?: Date;
  nominationEndsAt?: Date;
  startsAt?: Date;
  endsAt?: Date;
  resultsVisibility: "public" | "members_only" | "admin_only";
}): Promise<{ success: true } | { error: string }> {
  const adminId = await requireAdmin();
  const db = getDb();
  const { election } = await getSchema();

  try {
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
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create election" };
  }
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
  const status = electionData.status as "draft" | "nomination" | "scheduled" | "open" | "closed" | "published" | "voided";
  if (status === 'draft' || status === 'voided') return false;
  
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
  status: "draft" | "nomination" | "scheduled" | "open" | "closed" | "published" | "voided";
  resultsVisibility: "public" | "members_only" | "admin_only";
  voidReason: string;
  expectedVersion: number;
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

  // Optimistic locking: fetch current version
  const [currentElection] = await db
    .select({ version: election.version, status: election.status })
    .from(election)
    .where(eq(election.id, electionId))
    .limit(1);

  if (!currentElection) {
    return { error: "Election not found" };
  }

  if (data.expectedVersion !== undefined && data.expectedVersion !== currentElection.version) {
    return { error: "Election was modified by another user. Please refresh and try again." };
  }

  // If transitioning to voided, validate reason and prevent voiding published
  if (data.status === 'voided') {
    if (currentElection.status === 'published') {
      return { error: "Cannot void a published election. Published elections have final results." };
    }
    
    if (!data.voidReason || data.voidReason.trim().length === 0) {
      return { error: "A reason is required to void an election" };
    }
  }

  const updateData: Record<string, unknown> = { ...data };
  delete updateData.expectedVersion;
  if (data.nominationStartsAt) updateData.nominationStartsAt = new Date(data.nominationStartsAt);
  if (data.nominationEndsAt) updateData.nominationEndsAt = new Date(data.nominationEndsAt);
  if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
  if (data.endsAt) updateData.endsAt = new Date(data.endsAt);

  // Increment version for optimistic locking
  updateData.version = currentElection.version + 1;
  updateData.updatedAt = new Date();

  if (data.status === 'voided') {
    const voidReason = data.voidReason!.trim();
    updateData.voidedBy = adminId;
    updateData.voidedAt = new Date();
    updateData.voidReason = voidReason;
    
    // Audit log
    const { auditLog: auditLogSchema } = await getSchema();
    await db.insert(auditLogSchema).values({
      actorId: adminId,
      action: "election_voided",
      targetType: "election",
      targetId: electionId,
      metadata: { reason: voidReason },
    });
  }

  const result = await db
    .update(election)
    .set(updateData)
    .where(and(eq(election.id, electionId), eq(election.version, currentElection.version)));

  if (result.rowCount === 0) {
    return { error: "Election was modified by another user. Please refresh and try again." };
  }

  revalidatePath("/admin/elections");
  return { success: true };
}

export async function resolveTie(electionId: string, clubId: string, winningCandidateId: string, reason: string) {
  // Check admin permission for elections function
  const adminId = await requireAdmin();
  const db = getDb();
  const { candidate, election, auditLog: auditLogSchema } = await getSchema();
  const { eq, and } = await import("drizzle-orm");

  // Verify the election exists and get its tie break policy
  const [electionData] = await db
    .select({ tieBreakPolicy: election.tieBreakPolicy })
    .from(election)
    .where(eq(election.id, electionId))
    .limit(1);

  if (!electionData) {
    return { error: "Election not found" };
  }

  if (electionData.tieBreakPolicy === "revote") {
    return { error: "Manual review required — revote flow not yet implemented" };
  }

  // Verify the candidate exists and belongs to this club/election
  const [candidateData] = await db
    .select()
    .from(candidate)
    .where(and(eq(candidate.id, winningCandidateId), eq(candidate.clubId, clubId), eq(candidate.electionId, electionId)))
    .limit(1);

  if (!candidateData) {
    return { error: "Invalid candidate" };
  }

  // Update the candidate to mark as tie-resolved winner
  // We could add a flag to the candidate table, but for now we'll just log the resolution
  // In a more complete implementation, we might add a tieResolvedWinner field to the candidate table

  // Audit log
  await db.insert(auditLogSchema).values({
    actorId: adminId,
    action: "tie_resolved",
    targetType: "candidate",
    targetId: winningCandidateId,
    metadata: { 
      electionId, 
      clubId, 
      winningCandidateId, 
      reason: reason.trim() 
    },
  });

  revalidatePath("/admin/elections");
  revalidatePath(`/elections/${electionId}/results`);
  return { success: true };
}

export async function voidElection(electionId: string, reason: string) {
  return updateElection(electionId, { status: 'voided', voidReason: reason });
}

export async function invalidateVote(voteId: string, reason: string) {
  // Check admin permission for elections function
  const adminId = await requireAdmin();
  const db = getDb();
  const { vote, voteInvalidation, auditLog: auditLogSchema, appUser } = await getSchema();

  // Verify vote exists
  const [voteData] = await db
    .select()
    .from(vote)
    .where(eq(vote.id, voteId))
    .limit(1);

  if (!voteData) {
    return { error: "Vote not found" };
  }

  // Check if already invalidated
  const [existingInvalidation] = await db
    .select()
    .from(voteInvalidation)
    .where(eq(voteInvalidation.voteId, voteId))
    .limit(1);

  if (existingInvalidation) {
    return { error: "Vote already invalidated" };
  }

  // Validate reason
  if (!reason || reason.trim().length === 0) {
    return { error: "Reason is required" };
  }

  // Create invalidation record
  await db.insert(voteInvalidation).values({
    voteId,
    invalidatedBy: adminId,
    reason: reason.trim(),
  });

  // Audit log - NEVER include candidate_id, only vote_id and reason
  await db.insert(auditLogSchema).values({
    actorId: adminId,
    action: "vote_invalidated",
    targetType: "vote_invalidation",
    targetId: voteId,
    metadata: { voteId, reason: reason.trim() },
  });

  revalidatePath("/admin/elections");
  return { success: true };
}

export async function addCandidate(data: {
  electionId: string;
  clubId: string;
  name: string;
  publicStatement?: string;
  photoUrl?: string;
}) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { candidate, club, auditLog: auditLogSchema } = await getSchema();

  // Verify club exists and belongs to election
  const [clubData] = await db
    .select()
    .from(club)
    .where(and(eq(club.id, data.clubId), eq(club.electionId, data.electionId)))
    .limit(1);

  if (!clubData) {
    return { error: "Invalid club" };
  }

  const [newCandidate] = await db
    .insert(candidate)
    .values({
      electionId: data.electionId,
      clubId: data.clubId,
      name: data.name,
      publicStatement: data.publicStatement || null,
      photoUrl: data.photoUrl || null,
      selfNominated: false,
      nominatedBy: adminId,
      nominatedAt: new Date(),
    })
    .returning();

  // Audit log
  await db.insert(auditLogSchema).values({
    actorId: adminId,
    action: "candidate_added",
    targetType: "candidate",
    targetId: newCandidate.id,
    metadata: { electionId: data.electionId, clubId: data.clubId, selfNominated: false },
  });

  revalidatePath("/admin/elections");
  return { success: true, candidateId: newCandidate.id };
}

export async function updateCandidate(candidateId: string, data: Partial<{
  name: string;
  publicStatement: string | null;
  photoUrl: string | null;
}>) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { candidate, auditLog: auditLogSchema } = await getSchema();

  const [existing] = await db
    .select()
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!existing) {
    return { error: "Candidate not found" };
  }

  const updateData: Record<string, unknown> = { ...data };
  if (data.publicStatement !== undefined) updateData.publicStatement = data.publicStatement;
  if (data.photoUrl !== undefined) updateData.photoUrl = data.photoUrl;

  await db.update(candidate).set(updateData).where(eq(candidate.id, candidateId));

  // Audit log
  await db.insert(auditLogSchema).values({
    actorId: adminId,
    action: "candidate_added",
    targetType: "candidate",
    targetId: candidateId,
    metadata: { updated: true },
  });

  revalidatePath("/admin/elections");
  return { success: true };
}

export async function deleteCandidate(candidateId: string) {
  const adminId = await requireAdmin();
  const db = getDb();
  const { candidate, auditLog: auditLogSchema, nominationAnswer } = await getSchema();

  const [existing] = await db
    .select()
    .from(candidate)
    .where(eq(candidate.id, candidateId))
    .limit(1);

  if (!existing) {
    return { error: "Candidate not found" };
  }

  // Delete nomination answers first (cascade should handle this, but being explicit)
  await db.delete(nominationAnswer).where(eq(nominationAnswer.candidateId, candidateId));

  // Delete candidate
  await db.delete(candidate).where(eq(candidate.id, candidateId));

  // Audit log
  await db.insert(auditLogSchema).values({
    actorId: adminId,
    action: "candidate_added",
    targetType: "candidate",
    targetId: candidateId,
    metadata: { deleted: true },
  });

  revalidatePath("/admin/elections");
  return { success: true };
}