import { getDb } from "@/db";
const db = getDb();
import {
  appUser,
  campus,
  membership,
  election,
  club,
  candidate,
  electionVoter,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth-utils";

async function seed() {
  console.log("Seeding database...");

  // Create campuses
  const campuses = await db
    .insert(campus)
    .values([
      { name: "Main Campus" },
      { name: "North Campus" },
      { name: "South Campus" },
    ])
    .returning();

  console.log("Created campuses:", campuses.length);

  // Create admin user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@college.edu";
  const adminPassword = await hashPassword(process.env.SEED_ADMIN_PASSWORD || "admin123");
  const adminName = process.env.SEED_ADMIN_NAME || "Admin User";
  const adminEnrollment = process.env.SEED_ADMIN_ENROLLMENT || "ADMIN001";
  
  const [admin] = await db
    .insert(appUser)
    .values({
      email: adminEmail,
      passwordHash: adminPassword,
      fullName: adminName,
      enrollmentNo: adminEnrollment,
      isAdmin: true,
      isActive: true,
    })
    .returning();

  console.log("Created admin:", admin.email);

  // Create test students
  const studentPassword = await hashPassword("student123");
  const students = await db
    .insert(appUser)
    .values([
      {
        email: "student1@college.edu",
        passwordHash: studentPassword,
        fullName: "Alice Johnson",
        enrollmentNo: "STU2024001",
        campusId: campuses[0].id,
        isActive: true,
      },
      {
        email: "student2@college.edu",
        passwordHash: studentPassword,
        fullName: "Bob Smith",
        enrollmentNo: "STU2024002",
        campusId: campuses[0].id,
        isActive: true,
      },
      {
        email: "student3@college.edu",
        passwordHash: studentPassword,
        fullName: "Carol Davis",
        enrollmentNo: "STU2024003",
        campusId: campuses[1].id,
        isActive: true,
      },
      {
        email: "student4@college.edu",
        passwordHash: studentPassword,
        fullName: "David Wilson",
        enrollmentNo: "STU2024004",
        campusId: campuses[1].id,
        isActive: true,
      },
      {
        email: "student5@college.edu",
        passwordHash: studentPassword,
        fullName: "Eve Brown",
        enrollmentNo: "STU2024005",
        campusId: campuses[2].id,
        isActive: true,
      },
    ])
    .returning();

  console.log("Created students:", students.length);

  // Create memberships for students
  await db.insert(membership).values(
    students.map((s, i) => ({
      userId: s.id,
      roleTitle: i === 0 ? "President" : i === 1 ? "Vice President" : null,
      displayOrder: i,
      isPublic: i < 2,
    }))
  );

  console.log("Created memberships");

  // Create election
  const now = new Date();
  const startsAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  const [electionRecord] = await db
    .insert(election)
    .values({
      name: "Annual Club Elections 2026",
      multiCampus: true,
      status: "open",
      startsAt,
      endsAt,
      resultsVisibility: "members_only",
      createdBy: admin.id,
    })
    .returning();

  console.log("Created election:", electionRecord.name);

  // Create clubs
  const clubs = await db
    .insert(club)
    .values([
      { electionId: electionRecord.id, campusId: campuses[0].id, name: "Tech Club" },
      { electionId: electionRecord.id, campusId: campuses[0].id, name: "Debate Club" },
      { electionId: electionRecord.id, campusId: campuses[1].id, name: "Tech Club" },
      { electionId: electionRecord.id, campusId: campuses[1].id, name: "Music Club" },
      { electionId: electionRecord.id, campusId: campuses[2].id, name: "Art Club" },
      { electionId: electionRecord.id, campusId: campuses[2].id, name: "Sports Club" },
    ])
    .returning();

  console.log("Created clubs:", clubs.length);

  // Create candidates
  const candidates = await db
    .insert(candidate)
    .values([
      { electionId: electionRecord.id, clubId: clubs[0].id, name: "Alex Turner", statement: "Passionate about coding and innovation.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[0].id, name: "Jordan Lee", statement: "Building the future, one line at a time.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[1].id, name: "Taylor Swift", statement: "Debate is the art of persuasion.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[1].id, name: "Morgan Freeman", statement: "Every voice matters.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[2].id, name: "Casey Jones", statement: "Tech for everyone.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[2].id, name: "Riley Chen", statement: "Code with purpose.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[3].id, name: "Sam Rivera", statement: "Music connects us all.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[3].id, name: "Jamie Park", statement: "Melodies that inspire.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[4].id, name: "Drew Kim", statement: "Art is expression.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[4].id, name: "Quinn Adams", statement: "Colors speak louder than words.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[5].id, name: "Peyton Brooks", statement: "Sports build character.", statementStatus: "published" },
      { electionId: electionRecord.id, clubId: clubs[5].id, name: "Reese Foster", statement: "Teamwork makes the dream work.", statementStatus: "published" },
    ])
    .returning();

  console.log("Created candidates:", candidates.length);

  // Add voters to election
  const electionVoters = students.map((s) => ({
    electionId: electionRecord.id,
    userId: s.id,
    campusId: s.campusId,
  }));

  await db.insert(electionVoter).values(electionVoters);
  console.log("Added voters to election");

  console.log("Seeding complete!");
}

seed()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });