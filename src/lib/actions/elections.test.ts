import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database and auth
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ id: "vote-1" }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("@/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", isAdmin: true, enrollmentNo: "STU2024001" },
  }),
}));

vi.mock("@/db/schema", () => ({
  election: {},
  club: {},
  candidate: {},
  electionVoter: {},
  vote: {},
  voteInvalidation: {},
  appUser: {},
  nominationQuestion: {},
  nominationAnswer: {},
  auditLog: {},
  campus: {},
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Election Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
    mockDb.insert.mockReturnThis();
    mockDb.values.mockResolvedValue([{ id: "vote-1" }]);
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();
  });

  describe("castVote", () => {
    it("should reject vote when election is not open", async () => {
      const { castVote } = await import("@/lib/actions/elections");
      
      // Mock election not open
      mockDb.limit.mockResolvedValueOnce([{ status: "scheduled" }]);

      const result = await castVote("election-1", "club-1", "candidate-1");
      expect(result.error).toBe("Election is not open for voting");
    });

    it("should reject vote when user not eligible", async () => {
      const { castVote } = await import("@/lib/actions/elections");
      
      // Mock election open
      mockDb.limit.mockResolvedValueOnce([{ status: "open" }]);
      
      // Mock not eligible
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await castVote("election-1", "club-1", "candidate-1");
      expect(result.error).toBe("You are not eligible to vote in this election");
    });

    it("should reject duplicate vote", async () => {
      const { castVote } = await import("@/lib/actions/elections");
      
      // Mock election open
      mockDb.limit.mockResolvedValueOnce([{ status: "open" }]);
      
      // Mock eligible
      mockDb.limit.mockResolvedValueOnce([{ }]);
      
      // Mock candidate exists
      mockDb.limit.mockResolvedValueOnce([{ id: "candidate-1" }]);
      
      // Mock already voted
      mockDb.limit.mockResolvedValueOnce([{ }]);

      const result = await castVote("election-1", "club-1", "candidate-1");
      expect(result.error).toBe("You have already voted for this club");
    });
  });

  describe("invalidateVote", () => {
    it("should invalidate a vote and exclude it from tally", async () => {
      const { invalidateVote } = await import("@/lib/actions/elections");
      
      // Mock vote exists
      mockDb.limit.mockResolvedValueOnce([{ id: "vote-1", candidateId: "candidate-1" }]);
      
      // Mock no existing invalidation
      mockDb.limit.mockResolvedValueOnce([]);
      
      // Mock successful insert
      mockDb.values.mockResolvedValueOnce([{ id: "invalidation-1" }]);

      const result = await invalidateVote("vote-1", "Duplicate vote detected");

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        voteId: "vote-1",
        reason: "Duplicate vote detected",
      }));
    });

    it("should reject invalidation when vote not found", async () => {
      const { invalidateVote } = await import("@/lib/actions/elections");
      
      // Mock vote not found
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await invalidateVote("vote-1", "Test reason");

      expect(result.error).toBe("Vote not found");
    });

    it("should reject invalidation when vote already invalidated", async () => {
      const { invalidateVote } = await import("@/lib/actions/elections");
      
      // Mock vote exists
      mockDb.limit.mockResolvedValueOnce([{ id: "vote-1" }]);
      
      // Mock existing invalidation
      mockDb.limit.mockResolvedValueOnce([{ id: "invalidation-1" }]);

      const result = await invalidateVote("vote-1", "Test reason");

      expect(result.error).toBe("Vote already invalidated");
    });

    it("should reject invalidation with empty reason", async () => {
      const { invalidateVote } = await import("@/lib/actions/elections");
      
      // Mock vote exists
      mockDb.limit.mockResolvedValueOnce([{ id: "vote-1" }]);
      
      // Mock no existing invalidation
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await invalidateVote("vote-1", "   ");

      expect(result.error).toBe("Reason is required");
    });
  });

  describe("voidElection", () => {
    it("should void an election with a valid reason", async () => {
      const { voidElection } = await import("@/lib/actions/elections");
      
      // Mock current election status (not published)
      mockDb.limit.mockResolvedValueOnce([{ status: "open" }]);
      
      // Mock successful update
      mockDb.values.mockResolvedValueOnce([{ id: "election-1", voidedBy: "user-1", voidedAt: new Date(), voidReason: "Budget cut" }]);

      const result = await voidElection("election-1", "Budget cut");

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        status: "voided",
        voidedBy: "user-1",
        voidReason: "Budget cut",
      }));
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        action: "election_voided",
        targetId: "election-1",
        metadata: expect.objectContaining({ reason: "Budget cut" }),
      }));
    });

    it("should reject voiding a published election", async () => {
      const { voidElection } = await import("@/lib/actions/elections");
      
      // Mock current election status as published
      mockDb.limit.mockResolvedValueOnce([{ status: "published" }]);

      const result = await voidElection("election-1", "Some reason");

      expect(result.error).toBe("Cannot void a published election. Published elections have final results.");
    });

    it("should reject voiding with empty reason", async () => {
      const { voidElection } = await import("@/lib/actions/elections");
      
      // Mock current election status (not published)
      mockDb.limit.mockResolvedValueOnce([{ status: "open" }]);

      const result = await voidElection("election-1", "   ");

      expect(result.error).toBe("A reason is required to void an election");
    });

    it("should reject voiding non-existent election", async () => {
      const { voidElection } = await import("@/lib/actions/elections");
      
      // Mock election not found
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await voidElection("election-1", "Some reason");

      expect(result.error).toBe("Election not found");
    });
  });

  describe("isElectionVisibleToStudents", () => {
    it("should return false for voided elections", async () => {
      const { isElectionVisibleToStudents } = await import("@/lib/actions/elections");
      
      // Mock voided election
      mockDb.limit.mockResolvedValueOnce([{ status: "voided" }]);

      const result = await isElectionVisibleToStudents("election-1");

      expect(result).toBe(false);
    });

    it("should return false for draft elections", async () => {
      const { isElectionVisibleToStudents } = await import("@/lib/actions/elections");
      
      // Mock draft election
      mockDb.limit.mockResolvedValueOnce([{ status: "draft" }]);

      const result = await isElectionVisibleToStudents("election-1");

      expect(result).toBe(false);
    });

it("should return true for open elections with clubs", async () => {
      const { isElectionVisibleToStudents } = await import("@/lib/actions/elections");
      
      // Mock isElectionVisibleToStudents calls:
      // 1. First call: get election status (status: "open") with .limit(1)
      const mockSelectForStatus = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ status: "open" }]),
      };
      
      // 2. hasClubs calls select({ count: sql`count(*)` }).from(club).where(eq(...))
      const mockSelectForClubs = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      
      let callCount = 0;
      mockDb.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return mockSelectForStatus;
        }
        return mockSelectForClubs;
      });

      const result = await isElectionVisibleToStudents("election-1");

      expect(result).toBe(true);
    });
  });
});