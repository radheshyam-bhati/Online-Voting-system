import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Bell, Vote, LayoutDashboard, LogOut, Shield, ChevronRight } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Members", href: "/admin/members", icon: Users },
  { name: "Content", href: "/admin/content", icon: Calendar },
  { name: "Elections", href: "/admin/elections", icon: Vote },
  { name: "Admins", href: "/admin/admins", icon: Shield },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin" className="font-heading text-xl font-bold text-primary">
            Votara Admin
          </Link>
          <nav className="flex items-center gap-6">
            <ul className="flex items-center gap-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronRight className="w-3.5 h-3.5" />
                View Site
              </Button>
            </Link>
            <Link href="/api/auth/signout">
              <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive">
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-border py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-muted-foreground">
          <p>&copy; 2026 Votara Admin. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}