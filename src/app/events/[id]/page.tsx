import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format, isPast } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, ArrowLeft } from "lucide-react";
import { getEventById, getEventRsvpCount, getUserRsvpStatus, toggleEventRsvp } from "@/lib/actions/public";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    return { title: "Event Not Found — Votara" };
  }
  return {
    title: `${event.title} — Votara`,
    description: event.description,
  };
}

async function EventContent({ params }: EventPageProps) {
  const { id } = await params;
  const session = await auth();
  const [event, rsvpCount, userRsvped] = await Promise.all([
    getEventById(id),
    getEventRsvpCount(id),
    session?.user?.id ? getUserRsvpStatus(id, session.user.id) : Promise.resolve(false),
  ]);

  if (!event) {
    notFound();
  }

  const eventDate = new Date(event.startsAt);
  const isEventPast = isPast(eventDate);

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl font-bold text-primary">
            Votara
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/events" className="text-sm font-medium text-primary">Events</Link>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>

        <article className="max-w-3xl">
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={isEventPast ? "outline" : "default"}>
                {isEventPast ? "Past Event" : "Upcoming"}
              </Badge>
              {event.rsvpEnabled && (
                <Badge variant="secondary">RSVP Enabled</Badge>
              )}
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-4">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {format(eventDate, "EEEE, MMMM d, yyyy 'at' h:mm a")}
                  {event.endsAt && ` – ${format(new Date(event.endsAt), "h:mm a")}`}
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </header>

          {event.imageUrl && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-auto max-h-[400px] object-cover"
              />
            </div>
          )}

          <div className="prose text-muted-foreground mb-8">
            <p className="whitespace-pre-wrap">{event.description}</p>
          </div>

          {event.rsvpEnabled && !isEventPast && (
            <Card className="border-accent/50">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  RSVP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {rsvpCount} {rsvpCount === 1 ? "person" : "people"} going
                  </span>
                  <Button
                    variant={userRsvped ? "vote" : "default"}
                    onClick={async () => {
                      const result = await toggleEventRsvp(id);
                      if (result.error) {
                        alert(result.error);
                      }
                    }}
                    disabled={!session?.user?.id}
                  >
                    {userRsvped ? "✓ Going" : "I'm Going"}
                  </Button>
                </div>
                {!session?.user?.id && (
                  <p className="text-sm text-muted-foreground">
                    <Link href={`/login?redirect=/events/${id}`} className="underline hover:text-primary">
                      Log in
                    </Link>{" "}
                    to RSVP
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {event.rsvpEnabled && isEventPast && (
            <Card>
              <CardContent className="py-4">
                <p className="text-muted-foreground text-center">
                  This event has passed. RSVPs are no longer accepted.
                </p>
                <p className="text-muted-foreground text-center text-sm mt-1">
                  {rsvpCount} {rsvpCount === 1 ? "person" : "people"} attended
                </p>
              </CardContent>
            </Card>
          )}
        </article>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default EventContent;