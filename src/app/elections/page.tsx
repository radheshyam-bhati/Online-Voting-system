import { Metadata } from "next";
import Link from "next/link";
import { format, isPast, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Calendar, AlertCircle, CheckCircle, Clock, Users, ArrowRight } from "lucide-react";
import { getElectionDashboard } from "@/lib/actions/elections";

export const metadata: Metadata = {
  title: "Elections — Votara",
  description: "View and participate in club elections",
};

export default async function ElectionsDashboard() {
  const elections = await getElectionDashboard();

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
            <Link href="/elections" className="text-sm font-medium text-primary">Elections</Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary mb-4 flex items-center gap-3">
            <Vote className="w-8 h-8 text-accent" />
            Elections
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Participate in club elections. View active elections, cast your votes, and see results.
          </p>
        </header>

        {elections.length === 0 ? (
          <div className="text-center py-16">
            <Vote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-heading text-xl text-muted-foreground mb-2">No active elections</h3>
            <p className="text-muted-foreground mb-6">There are currently no elections open for voting.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {elections.map((election: { id: string; name: string; status: string; multiCampus: boolean; startsAt: Date | null; endsAt: Date | null; nominationStartsAt: Date | null; nominationEndsAt: Date | null; clubs: Array<{ id: string; name: string; campusId: string | null; candidates: Array<{ id: string; name: string; statement: string | null; photoUrl: string | null; statementStatus: string }>; hasVoted: boolean; votedCandidateId: string | null }>; userNominatedFor: string | null }) => (
              <Card key={election.id} className="border-accent/30">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="font-heading text-2xl">{election.name}</CardTitle>
                        <Badge variant={
                          election.status === "open" ? "default" :
                          election.status === "nomination" ? "secondary" :
                          "outline"
                        } className="text-sm capitalize">
                          {election.status}
                        </Badge>
                        {election.multiCampus && (
                          <Badge variant="outline" className="text-xs">
                            Multi-Campus
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {election.nominationStartsAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Nominations: {format(new Date(election.nominationStartsAt), "MMM d, yyyy")}
                            {election.nominationEndsAt && ` – ${format(new Date(election.nominationEndsAt), "MMM d, yyyy")}`}
                          </span>
                        )}
                        {election.startsAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Voting: {format(new Date(election.startsAt), "MMM d, yyyy")}
                            {election.endsAt && ` – ${format(new Date(election.endsAt), "MMM d, yyyy")}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {election.clubs.map((club: { id: string; name: string; campusId: string | null; candidates: Array<{ id: string; name: string; statement: string | null; photoUrl: string | null; statementStatus: string }>; hasVoted: boolean; votedCandidateId: string | null }) => (
                      <div key={club.id} className="border border-border rounded-lg p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-medium text-lg">{club.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {club.candidates.length} candidate{club.candidates.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {election.userNominatedFor === club.id && (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                You're running
                              </Badge>
                            )}
                            {club.hasVoted ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Voted
                              </Badge>
                            ) : election.status === "open" && !election.userNominatedFor ? (
                              <Link href={`/elections/${election.id}/vote/${club.id}`}>
                                <Button variant="vote" className="gap-2" size="lg">
                                  <Vote className="w-4 h-4" />
                                  Vote Now
                                </Button>
                              </Link>
                            ) : election.status === "nomination" && !election.userNominatedFor ? (
                              <Link href={`/elections/${election.id}/nominate/${club.id}`}>
                                <Button variant="outline" className="gap-2" size="lg">
                                  <Vote className="w-4 h-4" />
                                  Nominate Yourself
                                </Button>
                              </Link>
                            ) : election.status !== "open" && !election.userNominatedFor && !club.hasVoted ? (
                              <Badge variant="outline">
                                {election.status === "scheduled" ? "Upcoming" : "Not eligible"}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        {club.candidates.length > 0 && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {club.candidates.map((candidate: { id: string; name: string; statement: string | null; photoUrl: string | null; statementStatus: string }) => (
                              <div key={candidate.id} className={`p-3 rounded-lg border ${
                                club.votedCandidateId === candidate.id ? "border-primary bg-primary/5" : "border-border bg-card"
                              }`}>
                                <div className="font-medium">{candidate.name}</div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {candidate.statement || candidate.statementStatus === "pending" ? "Statement coming soon" : candidate.statement}
                                </p>
                                {candidate.statementStatus === "pending" && (
                                  <Badge variant="outline" className="mt-2 text-xs">Pending Review</Badge>
                                )}
                                {club.votedCandidateId === candidate.id && (
                                  <div className="mt-2 text-sm text-primary font-medium flex items-center gap-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Your vote
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
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