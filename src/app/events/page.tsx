import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { getUpcomingEvents, getPastEvents } from "@/lib/actions/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description: "Discover upcoming and past events from Votara. Workshops, socials, and more.",
};

export default async function EventsPage() {
  const [upcomingResult, pastResult] = await Promise.all([
    getUpcomingEvents(1, 20),
    getPastEvents(1, 20),
  ]);
  
  const upcoming = upcomingResult.data;
  const past = pastResult.data;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary mb-4">Events</h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Discover what&apos;s happening. From technical workshops to community socials, there&apos;s always something going on.
        </p>
      </header>

      {upcoming.length > 0 && (
        <section className="mb-16">
          <h2 className="font-heading text-2xl font-bold text-primary mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Upcoming Events
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((evt) => (
              <Link key={evt.id} href={`/events/${evt.id}`} className="block">
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-heading line-clamp-2">{evt.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {format(new Date(evt.startsAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm line-clamp-3">{evt.description}</p>
                    {evt.location && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{evt.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {format(new Date(evt.startsAt), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                        {evt.endsAt && ` – ${format(new Date(evt.endsAt), "h:mm a")}`}
                      </span>
                    </div>
                    {evt.rsvpEnabled && (
                      <Badge variant="outline" className="text-xs">
                        RSVP Enabled
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-heading text-2xl font-bold text-primary mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Past Events
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((evt) => (
              <Link key={evt.id} href={`/events/${evt.id}`} className="block">
                <Card className="hover:shadow-lg transition-shadow h-full opacity-70">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-heading line-clamp-2">{evt.title}</CardTitle>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {format(new Date(evt.startsAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground text-sm line-clamp-3">{evt.description}</p>
                    {evt.location && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{evt.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(new Date(evt.startsAt), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && past.length === 0 && (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="font-heading text-xl text-muted-foreground mb-2">No events yet</h3>
          <p className="text-muted-foreground">Check back soon for upcoming events!</p>
        </div>
      )}
    </main>
  );
}