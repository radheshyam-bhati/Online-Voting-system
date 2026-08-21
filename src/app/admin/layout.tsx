import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/403");
  }

  if (!session.user?.isAdmin) {
    redirect("/403");
  }

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <Nav isAdmin />
      <div className="flex flex-1">
        <AdminSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
      <Footer isAdmin />
    </div>
  );
}