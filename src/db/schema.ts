import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const electionStatusEnum = pgEnum("election_status", [
  "draft",
  "nomination",
  "scheduled",
  "open",
  "closed",
  "published",
]);

export const resultsVisibilityEnum = pgEnum("results_visibility", [
  "public",
  "members_only",
  "admin_only",
]);

export const announcementVisibilityEnum = pgEnum("announcement_visibility", [
  "public",
  "members_only",
]);

export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "approved",
  "declined",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "student_list_uploaded",
  "election_opened",
  "election_closed",
  "results_published",
  "candidate_added",
  "student_deactivated",
  "election_created",
  "election_scheduled",
  "vote_cast",
  "admin_granted",
  "admin_permissions_changed",
  "admin_revoked",
]);

export const adminFunctionEnum = pgEnum("admin_function", [
  "members",
  "content",
  "elections",
  "admins",
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  fullName: text("full_name").notNull(),
  enrollmentNo: text("enrollment_no").unique(),
  campusId: uuid("campus_id").references(() => campus.id, { onDelete: "set null" }),
  isAdmin: boolean("is_admin").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AppUser = typeof appUser.$inferSelect;

export const session = pgTable("session", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" }),
  sessionToken: text("session_token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campus = pgTable("campus", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membership = pgTable("membership", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" })
    .unique(),
  roleTitle: text("role_title"),
  displayOrder: integer("display_order").notNull().default(999),
  isPublic: boolean("is_public").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const joinRequest = pgTable("join_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  enrollmentNo: text("enrollment_no").notNull(),
  contactEmail: text("contact_email").notNull(),
  message: text("message"),
  status: joinRequestStatusEnum("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => appUser.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const event = pgTable("event", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  imageUrl: text("image_url"),
  rsvpEnabled: boolean("rsvp_enabled").notNull().default(false),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const eventRsvp = pgTable("event_rsvp", {
  eventId: uuid("event_id")
    .notNull()
    .references(() => event.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.eventId, table.userId] }),
}));

export const announcement = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  imageUrl: text("image_url"),
  visibility: announcementVisibilityEnum("visibility").notNull().default("members_only"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const election = pgTable("election", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  multiCampus: boolean("multi_campus").notNull().default(false),
  status: electionStatusEnum("status").notNull().default("draft"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  nominationStartsAt: timestamp("nomination_starts_at", { withTimezone: true }),
  nominationEndsAt: timestamp("nomination_ends_at", { withTimezone: true }),
  resultsVisibility: resultsVisibilityEnum("results_visibility").notNull().default("members_only"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => appUser.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

export const club = pgTable("club", {
  id: uuid("id").primaryKey().defaultRandom(),
  electionId: uuid("election_id")
    .notNull()
    .references(() => election.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campus.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidate = pgTable("candidate", {
  id: uuid("id").primaryKey().defaultRandom(),
  electionId: uuid("election_id")
    .notNull()
    .references(() => election.id, { onDelete: "cascade" }),
  clubId: uuid("club_id")
    .notNull()
    .references(() => club.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  statement: text("statement"),
  photoUrl: text("photo_url"),
  selfNominated: boolean("self_nominated").notNull().default(false),
  nominatedBy: uuid("nominated_by").references(() => appUser.id, { onDelete: "set null" }),
  publicStatement: text("public_statement"),
  statementStatus: text("statement_status").notNull().default("published"),
  nominatedAt: timestamp("nominated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueNomination: uniqueIndex("uq_one_nomination_per_student_per_election")
    .on(table.electionId, table.nominatedBy)
    .where(sql`${table.nominatedBy} IS NOT NULL`),
}));

export const nominationQuestion = pgTable("nomination_question", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id")
    .notNull()
    .references(() => club.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nominationAnswer = pgTable("nomination_answer", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidate.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => nominationQuestion.id, { onDelete: "cascade" }),
  answerText: text("answer_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueAnswer: uniqueIndex("uq_nomination_answer_candidate_question").on(table.candidateId, table.questionId),
}));

export const electionVoter = pgTable("election_voter", {
  electionId: uuid("election_id")
    .notNull()
    .references(() => election.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campus.id),
}, (table) => ({
  pk: primaryKey({ columns: [table.electionId, table.userId] }),
}));

export const vote = pgTable("vote", {
  id: uuid("id").primaryKey().defaultRandom(),
  electionId: uuid("election_id")
    .notNull()
    .references(() => election.id),
  clubId: uuid("club_id")
    .notNull()
    .references(() => club.id),
  studentId: uuid("student_id")
    .notNull()
    .references(() => appUser.id),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidate.id),
  castAt: timestamp("cast_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueVote: uniqueIndex("uq_one_vote_per_student_per_club").on(
    table.electionId,
    table.studentId,
    table.clubId
  ),
  clubIndex: index("idx_vote_club").on(table.clubId),
  electionIndex: index("idx_vote_election").on(table.electionId),
  studentIndex: index("idx_vote_student").on(table.studentId),
}));

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => appUser.id, { onDelete: "set null" }),
  action: auditActionEnum("action").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const adminGrant = pgTable("admin_grant", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => appUser.id, { onDelete: "cascade" }),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  grantedBy: uuid("granted_by").references(() => appUser.id, { onDelete: "set null" }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => ({
  uniqueUser: uniqueIndex("uq_admin_grant_user").on(table.userId).where(sql`${table.revokedAt} IS NULL`),
}));

export const adminPermission = pgTable("admin_permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminGrantId: uuid("admin_grant_id")
    .notNull()
    .references(() => adminGrant.id, { onDelete: "cascade" }),
  function: adminFunctionEnum("function").notNull(),
  campusId: uuid("campus_id").references(() => campus.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniquePermission: uniqueIndex("uq_admin_permission").on(table.adminGrantId, table.function, table.campusId),
  grantIndex: index("idx_admin_permission_grant").on(table.adminGrantId),
}));