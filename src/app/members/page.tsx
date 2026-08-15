import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, User, Mail, Award } from "lucide-react";
import { getPublicMembers, getAllMembers } from "@/lib/actions/public";
import { auth } from "@/lib/auth";

type MemberWithEmail = {
  id: string;
  fullName: string;
  enrollmentNo: string | null;
  roleTitle: string | null;
  displayOrder: number;
  isPublic: boolean;
  joinedAt: Date;
  email?: string;
  isActive?: boolean;
};

function MemberCard({
  member,
  isAdmin,
  size = "default",
}: {
  member: MemberWithEmail;
  isAdmin: boolean;
  size?: "default" | "small";
}) {
  const isLeader = member.roleTitle && member.isPublic;
  const avatarSize = size === "default" ? "w-24 h-24" : "w-20 h-20";
  const iconSize = size === "default" ? "w-12 h-12" : "w-10 h-10";
  const titleSize = size === "default" ? "text-base" : "text-sm";

  return (
    <Card className="text-center">
      <CardHeader className="pb-2">
        <div className="mx-auto mb-4">
          <div className={`${avatarSize} rounded-full bg-primary/10 flex items-center justify-center mx-auto`}>
            <User className={`${iconSize} text-primary`} />
          </div>
        </div>
        <CardTitle className={`font-heading ${titleSize}`}>{member.fullName}</CardTitle>
        {member.roleTitle && (
          <Badge variant={isLeader ? "default" : "secondary"} className={`mt-${size === "default" ? "2" : "1"} ${size === "default" ? "text-sm" : "text-xs"}`}>
            {member.roleTitle}
          </Badge>
        )}
      </CardHeader>
      <CardContent className={`space-y-${size === "default" ? "2" : "1"} text-sm text-muted-foreground`}>
        {member.enrollmentNo && (
          <p className={`font-mono ${size === "default" ? "" : "text-xs"}`}>{member.enrollmentNo}</p>
        )}
        {isAdmin && member.email && (
          <p className="flex items-center justify-center gap-1">
            <Mail className={size === "default" ? "w-3.5 h-3.5" : "w-3 h-3"} />
            <span className={size === "default" ? "" : "text-xs"}>{member.email}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Team — Votara",
  description: "Meet the leadership and members who make our club community thrive.",
};

export default async function MembersPage() {
  const session = await auth();
  const isAdmin = session?.user?.isAdmin === true;
  const publicMembers = await getPublicMembers();
  const adminMembers = isAdmin ? await getAllMembers() : [];

  const allMembers: MemberWithEmail[] = isAdmin
    ? adminMembers.map((m) => ({
        ...m,
        displayOrder: m.displayOrder ?? 999,
        isPublic: m.isPublic ?? false,
        joinedAt: m.joinedAt ?? new Date(),
      }))
    : publicMembers.map((m) => ({
        ...m,
        displayOrder: m.displayOrder,
        isPublic: m.isPublic,
        joinedAt: m.joinedAt,
      }));

  const leadership = allMembers.filter((m) => Boolean(m.roleTitle) && m.isPublic);
  const regularMembers = allMembers.filter((m) => !m.roleTitle || !m.isPublic);

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl font-bold text-primary">
            Votara
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/events" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Events
            </Link>
            <Link href="/announcements" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Announcements
            </Link>
            <Link href="/members" className="text-sm font-medium text-primary">Members</Link>
            <Link href="/join" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Join
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary mb-4 flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            Our Team
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Meet the leadership and members who make our club community thrive.
          </p>
        </header>

        {leadership.length > 0 && (
          <section className="mb-16">
            <h2 className="font-heading text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Leadership
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {leadership.map((member) => (
                <MemberCard key={member.id} member={member} isAdmin={isAdmin} size="default" />
              ))}
            </div>
          </section>
        )}

        {regularMembers.length > 0 && (
          <section className="mb-16">
            <h2 className="font-heading text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {regularMembers.map((member) => (
                <MemberCard key={member.id} member={member} isAdmin={isAdmin} size="small" />
              ))}
            </div>
          </section>
        )}

        {allMembers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-xl text-muted-foreground mb-2">No members yet</h3>
            <p className="text-muted-foreground mb-6">Be the first to join our community!</p>
            <Link href="/join">
              <Button size="lg" className="gap-2">
                Join the Club
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </Link>
          </div>
        ) : null}

        {isAdmin && (
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="font-heading text-xl font-bold text-primary mb-4">Admin View</h2>
            <p className="text-muted-foreground mb-4">
              Showing all {allMembers.length} members including non-public profiles.
            </p>
            <Link href="/admin/members">
              <Button variant="outline">Manage Members</Button>
            </Link>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}