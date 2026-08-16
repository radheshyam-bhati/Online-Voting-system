import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Bell, Vote, AlertCircle, ArrowRight } from "lucide-react";
import { getAdminDashboardStats } from "@/lib/actions/admin";

export const metadata: Metadata = {
  title: "Admin Dashboard — Votara",
  description: "Admin dashboard for managing the club website and elections",
};

export default async function AdminDashboard() {
  const stats = await getAdminDashboardStats();

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/members",
    },
    {
      title: "Pending Join Requests",
      value: stats.pendingRequests,
      icon: AlertCircle,
      color: stats.pendingRequests > 0 ? "text-destructive" : "text-muted-foreground",
      bg: stats.pendingRequests > 0 ? "bg-destructive/10" : "bg-muted/50",
      href: "/admin/members",
      badge: stats.pendingRequests > 0 ? "Action needed" : null,
    },
    {
      title: "Upcoming Events",
      value: stats.upcomingEvents,
      icon: Calendar,
      color: "text-accent",
      bg: "bg-accent/10",
      href: "/admin/content",
    },
    {
      title: "Published Announcements",
      value: stats.publishedAnnouncements,
      icon: Bell,
      color: "text-green-600",
      bg: "bg-green-600/10",
      href: "/admin/content",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/admin" className="font-heading text-2xl font-bold text-primary">
            Votara Admin
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">View Site</Button>
            </Link>
            <Link href="/api/auth/signout" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Logout
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your club website, members, content, and elections</p>
        </header>

        {stats.activeElection && (
          <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Vote className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-medium text-primary">Active Election: {stats.activeElection.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="capitalize">{stats.activeElection.status}</span>
                  </p>
                </div>
              </div>
              <Link href="/admin/elections">
                <Button variant="outline" size="sm" className="gap-2">
                  Manage Election
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {statCards.map((stat) => (
            <Link key={stat.title} href={stat.href} className="block">
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                    <div className={`${stat.bg} p-2 rounded-lg`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <div className="font-heading text-3xl font-bold text-foreground">{stat.value}</div>
                  {stat.badge && <Badge variant="destructive" className="text-xs">{stat.badge}</Badge>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>

        <section>
          <h2 className="font-heading text-xl font-bold text-primary mb-6">Quick Actions</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/admin/members">
              <Card className="hover:shadow-lg transition-shadow h-full border-accent/30">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Manage Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">View members, approve join requests, update roles</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/content">
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Manage Content
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">Create and edit events and announcements</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/elections">
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <Vote className="w-5 h-5" />
                    Manage Elections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">Configure elections, clubs, candidates, and results</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara Admin. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}