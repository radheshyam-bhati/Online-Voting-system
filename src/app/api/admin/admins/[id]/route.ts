import { updateAdminPermissions, revokeAdminAccess } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updatePermissionsSchema = z.object({
  permissions: z.array(z.object({
    function: z.enum(["members", "content", "elections", "admins"]),
    campusId: z.string().uuid().nullable().optional(),
  })),
  isSuperAdmin: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updatePermissionsSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await updateAdminPermissions(
      id,
      parsed.data.permissions,
      session.user.id
    );

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to update admin" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await revokeAdminAccess(id, session.user.id);

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to revoke admin" }, { status: 500 });
  }
}