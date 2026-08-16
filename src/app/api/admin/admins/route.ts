import { getAllAdmins, getAdminPermissions } from "@/lib/permissions";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { grants, permissions } = await getAllAdmins();

    // Format the data for the UI
    const admins = grants.map(grant => {
      const userPerms = permissions
        .filter(p => p.grantId === grant.id)
        .map(p => ({
          function: p.function,
          campusId: p.campusId,
          campusName: p.campusName,
        }));

      return {
        id: grant.id,
        userId: grant.userId,
        userName: grant.userName || "Unknown",
        userEmail: grant.userEmail || "Unknown",
        isSuperAdmin: grant.isSuperAdmin,
        grantedAt: grant.grantedAt,
        revokedAt: grant.revokedAt,
        grantedBy: grant.grantedBy,
        grantedByName: grant.grantedByName || "Unknown",
        permissions: userPerms,
      };
    });

    return Response.json(admins);
  } catch (error) {
    return Response.json({ error: "Failed to fetch admins" }, { status: 500 });
  }
}