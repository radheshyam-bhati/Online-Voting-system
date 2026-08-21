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
  city: z.string().optional(),
  department: z.string().optional(),
});

async function processStudent(
  db: ReturnType<typeof getDb>,
  parsed: z.infer<typeof studentSchema>,
  campuses: Array<{ id: string; name: string }>
) {
  const { appUser, campus } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  // Check if email or enrollment already exists
  const [existingEmail] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.email, parsed.email))
    .limit(1);

  if (existingEmail) {
    return { error: "Email already exists" };
  }

  const [existingEnrollment] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.enrollmentNo, parsed.enrollmentNo))
    .limit(1);

  if (existingEnrollment) {
    return { error: "Enrollment number already exists" };
  }

  // Resolve campus from city name
  let campusId: string | null = null;
  if (parsed.city && parsed.city.trim() !== "") {
    const campusMatch = campuses.find(c => c.name.toLowerCase() === parsed.city!.trim().toLowerCase());
    if (campusMatch) {
      campusId = campusMatch.id;
    } else {
      // Create campus if it doesn't exist
      const [newCampus] = await db
        .insert(campus)
        .values({ name: parsed.city!.trim() })
        .returning();
      campusId = newCampus.id;
    }
  }

  // Generate secure random password
  const { hashPassword } = await import("@/lib/auth-utils");
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const [newUser] = await db
    .insert(appUser)
    .values({
      email: parsed.email,
      passwordHash,
      fullName: parsed.fullName,
      enrollmentNo: parsed.enrollmentNo,
      campusId,
      department: parsed.department || null,
      isActive: true,
      isAdmin: false,
    })
    .returning();

  console.log(`Created user: ${parsed.email} with temp password: ${tempPassword}`);

  return { success: true, user: newUser };
}

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function processCsvRow(
  db: ReturnType<typeof getDb>,
  row: Record<string, string>,
  rowNum: number,
  campuses: Array<{ id: string; name: string }>
): Promise<{ success: true } | { success: false; error: string; data?: unknown }> {
  const { appUser, campus } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  try {
    // Map the actual CSV columns: Name, Email Address, City, Department, Enrollment ID
    const parsed = studentSchema.safeParse({
      email: row["Email Address"]?.trim() || row.email?.trim(),
      fullName: row["Name"]?.trim() || row.fullName?.trim(),
      enrollmentNo: row["Enrollment ID"]?.trim() || row.enrollmentNo?.trim() || row.enrollment?.trim() || row.studentId?.trim(),
      city: row["City"]?.trim() || row.city?.trim() || "",
      department: row["Department"]?.trim() || row.department?.trim() || "",
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message, data: row };
    }

    // Check if email or enrollment already exists
    const [existingEmail] = await db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.email, parsed.data.email))
      .limit(1);

    if (existingEmail) {
      return { success: false, error: "Email already exists", data: row };
    }

    const [existingEnrollment] = await db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.enrollmentNo, parsed.data.enrollmentNo))
      .limit(1);

    if (existingEnrollment) {
      return { success: false, error: "Enrollment number already exists", data: row };
    }

    // Resolve campus from city name
    let campusId: string | null = null;
    if (parsed.data.city) {
      const campusMatch = campuses.find(c => c.name.toLowerCase() === parsed.data.city!.toLowerCase());
      if (campusMatch) {
        campusId = campusMatch.id;
      } else {
        // Create campus if it doesn't exist
        const [newCampus] = await db
          .insert(campus)
          .values({ name: parsed.data.city! })
          .returning();
        campusId = newCampus.id;
      }
    }

    // Generate secure random password
    const { hashPassword } = await import("@/lib/auth-utils");
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await db.insert(appUser).values({
      email: parsed.data.email,
      passwordHash,
      fullName: parsed.data.fullName,
      enrollmentNo: parsed.data.enrollmentNo,
      campusId,
      department: parsed.data.department || null,
      isActive: true,
      isAdmin: false,
    });

    console.log(`Imported user: ${parsed.data.email} with temp password: ${tempPassword}`);

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error", data: row };
  }
}

export async function POST(request: Request) {
  const session = await checkAdmin();
  if (session instanceof Response) return session;

  try {
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("multipart/form-data")) {
      // Handle CSV file upload
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
      const { campus } = await getSchema();

      // Get all campuses for validation
      const campuses = await db.select({ id: campus.id, name: campus.name }).from(campus);

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +2 because header is row 1, 0-indexed

        const result = await processCsvRow(db, row, rowNum, campuses);
        if (!result.success) {
          results.errors.push({
            row: result.data ? rowNum : 0,
            error: result.error,
            data: result.data,
          });
          continue;
        }

        results.success++;
      }

      return Response.json(results);
    } else if (contentType.includes("application/json")) {
      // Handle single student JSON request
      const body = await request.json();
      const parsed = studentSchema.safeParse({
        email: body.email?.trim(),
        fullName: body.name?.trim(),
        enrollmentNo: body.enrollmentNo?.trim(),
        city: body.city?.trim() || "",
        department: body.department?.trim() || "",
      });

      if (!parsed.success) {
        return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const db = getDb();
      const { appUser, membership, campus } = await getSchema();

      // Get all campuses for validation
      const campuses = await db.select({ id: campus.id, name: campus.name }).from(campus);

      const result = await processStudent(db, parsed.data, campuses);
      if ("error" in result) {
        return Response.json({ error: result.error }, { status: 400 });
      }

      return Response.json({ success: 1 });
    } else {
      return Response.json({ error: "Invalid content type" }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}