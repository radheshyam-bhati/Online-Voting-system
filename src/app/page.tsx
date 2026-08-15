import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, ArrowRight } from "lucide-react";
import { getLatestAnnouncement, getUpcomingEvents } from "@/lib/actions/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Votara — College Club Website",
  description: "Your college club's home online — events, announcements, members, and secure elections all in one place.",
};

export default async function Home() {
  const [latestAnnouncement, upcomingEvents] = await Promise.all([
    getLatestAnnouncement(),
    getUpcomingEvents(1),
  ]);

  const nextEvent = upcomingEvents[0];

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="mb-20">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-6">
            Welcome to Votara
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Your college club&apos;s home online &mdash; events, announcements, members, and secure elections all in one place.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2 mb-20">
          {nextEvent && (
            <Link href={`/events/${nextEvent.id}`} className="block">
              <Card className="hover:shadow-lg transition-shadow h-full border-accent/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-heading">Next Event</CardTitle>
                    <Badge variant="secondary" className="text-xs whitespace-nowrap">
                      {format(new Date(nextEvent.startsAt), "MMM d")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="font-heading text-lg text-foreground">{nextEvent.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-2">{nextEvent.description}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {format(new Date(nextEvent.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  {nextEvent.location && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="w-3.5 h-3.5" />
                      <span>{nextEvent.location}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )}

          {latestAnnouncement && (
            <Link href="/announcements" className="block">
              <Card className="hover:shadow-lg transition-shadow h-full border-accent/30">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Latest Announcement
                    </CardTitle>
                    <Badge variant="outline" className="text-xs capitalize whitespace-nowrap">
                      {latestAnnouncement.visibility.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <h3 className="font-heading text-lg text-foreground">{latestAnnouncement.title}</h3>
                  <p className="text-muted-foreground text-sm line-clamp-3">{latestAnnouncement.body}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(latestAnnouncement.publishedAt), "MMM d, yyyy")}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}

          {!nextEvent && !latestAnnouncement && (
            <div className="md:col-span-2">
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No upcoming events or announcements yet.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-3 mb-20">
          <Link href="/events" className="block">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="font-heading">All Events</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Discover what&apos;s happening next. From workshops to socials, never miss an event.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/announcements" className="block">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="font-heading">All Announcements</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Stay updated with the latest club news, updates, and important notices.
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/members" className="block">
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardHeader>
                <CardTitle className="font-heading">Our Team</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meet the leadership and members who make our club community thrive.
                </p>
              </CardContent>
            </Card>
          </Link>
        </section>

        <section className="text-center">
          <Link href="/join">
            <Button size="lg" className="gap-2">
              Join the Club
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}