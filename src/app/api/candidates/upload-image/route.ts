import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { getDb } from "@/db";
import { eq, and, sql } from "drizzle-orm";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is eligible to nominate (must be in nomination period for at least one election)
  const db = getDb();
  const { election, electionVoter, club, candidate } = await import("@/db/schema");
  const now = new Date();

  const [eligibleElection] = await db
    .select({ id: election.id })
    .from(election)
    .innerJoin(electionVoter, eq(electionVoter.electionId, election.id))
    .where(and(
      eq(electionVoter.userId, session.user.id),
      sql`${election.status} = 'nomination'`,
      sql`${election.nominationStartsAt} <= ${now}`,
      sql`${election.nominationEndsAt} >= ${now}`
    ))
    .limit(1);

  if (!eligibleElection) {
    return Response.json({ error: "You are not eligible to upload a candidate photo at this time. Nominations are not open for any election you're eligible for." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return Response.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `candidates/self-nominated/${session!.user.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
    });

    return Response.json({ url: blob.url });
  } catch (error) {
    console.error("Image upload failed:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}