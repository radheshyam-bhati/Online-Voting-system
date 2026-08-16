import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell } from "lucide-react";
import { getAnnouncements } from "@/lib/actions/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Announcements — Votara",
  description: "Stay updated with the latest club news, updates, and important notices.",
};

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements("public");

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
            <Link href="/announcements" className="text-sm font-medium text-primary">Announcements</Link>
            <Link href="/members" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Members
            </Link>
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
            <Bell className="w-8 h-8 text-accent" />
            Announcements
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Stay updated with the latest club news, updates, and important notices.
          </p>
        </header>

        {announcements.length > 0 ? (
          <div className="space-y-6">
            {announcements.map((ann) => (
              <Card key={ann.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="font-heading text-xl">{ann.title}</CardTitle>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(ann.publishedAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {ann.visibility.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {ann.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      <img
                        src={ann.imageUrl}
                        alt=""
                        className="w-full h-auto max-h-[300px] object-cover"
                      />
                    </div>
                  )}
                  <div className="prose text-muted-foreground">
                    <p className="whitespace-pre-wrap">{ann.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-xl text-muted-foreground mb-2">No announcements yet</h3>
            <p className="text-muted-foreground">Check back soon for updates!</p>
          </div>
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