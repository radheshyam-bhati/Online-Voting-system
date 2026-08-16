import { getDb } from "@/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { parse } from "csv-parse/sync";

async function getSchema() {
  const { appUser, membership, campus } = await import("@/db/schema");
  return { appUser, membership, campus };
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

const studentSchema = z.object({
  email: z.string().email("Invalid email"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  enrollmentNo: z.string().min(1, "Enrollment number is required"),
  campusId: z.string().uuid("Invalid campus ID").optional().nullable(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleTitle: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return Response.json({ error: "File must be a CSV" }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const results = {
      success: 0,
      errors: [] as Array<{ row: number; error: string; data: unknown }>,
    };

    const db = getDb();
    const { appUser, membership, campus } = await getSchema();

    // Get all campuses for validation
    const campuses = await db.select({ id: campus.id, name: campus.name }).from(campus);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // +2 because header is row 1, 0-indexed

      try {
        const parsed = studentSchema.safeParse({
          email: row.email?.trim(),
          fullName: row.fullName?.trim() || row.name?.trim(),
          enrollmentNo: row.enrollmentNo?.trim() || row.enrollment?.trim() || row.studentId?.trim(),
          campusId: row.campusId?.trim() || null,
          password: row.password?.trim() || undefined,
          roleTitle: row.roleTitle?.trim() || row.role?.trim() || undefined,
          isPublic: row.isPublic?.toLowerCase() === "true" || row.public?.toLowerCase() === "true",
        });

        if (!parsed.success) {
          results.errors.push({
            row: rowNum,
            error: parsed.error.issues[0].message,
            data: row,
          });
          continue;
        }

        // Check if email or enrollment already exists
        const [existingEmail] = await db
          .select({ id: appUser.id })
          .from(appUser)
          .where(eq(appUser.email, parsed.data.email))
          .limit(1);

        if (existingEmail) {
          results.errors.push({
            row: rowNum,
            error: "Email already exists",
            data: row,
          });
          continue;
        }

        const [existingEnrollment] = await db
          .select({ id: appUser.id })
          .from(appUser)
          .where(eq(appUser.enrollmentNo, parsed.data.enrollmentNo))
          .limit(1);

        if (existingEnrollment) {
          results.errors.push({
            row: rowNum,
            error: "Enrollment number already exists",
            data: row,
          });
          continue;
        }

        // Validate campus if provided
        if (parsed.data.campusId) {
          const campusExists = campuses.find(c => c.id === parsed.data.campusId);
          if (!campusExists) {
            results.errors.push({
              row: rowNum,
              error: "Invalid campus ID",
              data: row,
            });
            continue;
          }
        }

        // Generate default password if not provided
        const { hashPassword } = await import("@/lib/auth-utils");
        const password = parsed.data.password || "changeme123";
        const passwordHash = await hashPassword(password);

        const [newUser] = await db
          .insert(appUser)
          .values({
            email: parsed.data.email,
            passwordHash,
            fullName: parsed.data.fullName,
            enrollmentNo: parsed.data.enrollmentNo,
            campusId: parsed.data.campusId || null,
            isActive: true,
            isAdmin: false,
          })
          .returning();

        // Create membership if role provided
        if (parsed.data.roleTitle) {
          await db.insert(membership).values({
            userId: newUser.id,
            roleTitle: parsed.data.roleTitle,
            displayOrder: 999,
            isPublic: parsed.data.isPublic || false,
          });
        }

        results.success++;
      } catch (error) {
        results.errors.push({
          row: rowNum,
          error: error instanceof Error ? error.message : "Unknown error",
          data: row,
        });
      }
    }

    return Response.json(results);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}