import { voidElection } from "@/lib/actions/elections";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin permission for elections function
  const { checkAdminPermission } = await import("@/lib/permissions");
  const permission = await checkAdminPermission("elections");
  if (!permission.allowed) {
    return Response.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { reason } = body;

  const result = await voidElection(id, reason);

  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ success: true });
}