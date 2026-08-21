import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { checkAdminPermission } from "@/lib/permissions";

async function checkAdminOrSelf(requiredFunction: "elections") {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  const permission = await checkAdminPermission(requiredFunction);
  if (!permission.allowed) {
    return { error: Response.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 }), session };
  }
  return { error: null, session };
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  const { error, session } = await checkAdminOrSelf("elections");
  if (error) return error;

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

    const filename = `candidates/${session!.user.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    
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