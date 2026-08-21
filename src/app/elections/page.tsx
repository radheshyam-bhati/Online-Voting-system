import { Metadata } from "next";
import Link from "next/link";
import { format, isPast, isFuture } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Calendar, AlertCircle, CheckCircle, Clock, Users, ArrowRight } from "lucide-react";
import { getElectionDashboard } from "@/lib/actions/elections";
import { isCandidateProfileVisible } from "@/lib/candidate-visibility";

interface Candidate {
  id: string;
  name: string;
  statement: string | null;
  photoUrl: string | null;
}

interface Club {
  id: string;
  name: string;
  campusId: string | null;
  candidates: Candidate[];
  hasVoted: boolean;
  votedCandidateId: string | null;
}

interface Election {
  id: string;
  name: string;
  status: string;
  multiCampus: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  nominationStartsAt: Date | null;
  nominationEndsAt: Date | null;
  clubs: Club[];
  userNominatedFor: string | null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function CandidatePhoto({ name, photoUrl, profileVisible }: { name: string; photoUrl: string | null; profileVisible: boolean }) {
  if (!profileVisible) {
    return (
      <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-2">
        <span className="font-heading text-lg font-bold text-primary">{getInitials(name)}</span>
      </div>
    );
  }

  if (photoUrl) {
    return (
      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border mx-auto mb-2">
        <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-primary/10 flex items-center justify-center mx-auto mb-2">
      <span className="font-heading text-lg font-bold text-primary">{getInitials(name)}</span>
    </div>
  );
}

function CandidateCard({ 
  candidate, 
  electionStatus, 
  isVoted 
}: { 
  candidate: Candidate; 
  electionStatus: string; 
  isVoted: boolean;
}) {
  const profileVisible = isCandidateProfileVisible(electionStatus);
  
  return (
    <div className={`p-3 rounded-lg border ${isVoted ? "border-primary bg-primary/5" : "border-border bg-card"} text-center`}>
      <CandidatePhoto name={candidate.name} photoUrl={candidate.photoUrl} profileVisible={profileVisible} />
      <div className="font-medium">{candidate.name}</div>
      {profileVisible ? (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
          {candidate.statement || "No statement provided"}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-1 italic">
          Photo and statement available once voting opens
        </p>
      )}
      {isVoted && (
        <div className="mt-2 text-sm text-primary font-medium flex items-center gap-1 justify-center">
          <CheckCircle className="w-3.5 h-3.5" />
          Your vote
        </div>
      )}
    </div>
  );
}

function ClubCard({ 
  club, 
  election 
}: { 
  club: Club; 
  election: Election;
}) {
  return (
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
          {club.candidates.map((candidate: Candidate) => (
            <CandidateCard 
              key={candidate.id} 
              candidate={candidate} 
              electionStatus={election.status}
              isVoted={club.votedCandidateId === candidate.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ElectionCard({ election }: { election: Election }) {
  return (
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
          {election.clubs.map((club: Club) => (
            <ClubCard key={club.id} club={club} election={election} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

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
            {elections.map((election: Election) => (
              <ElectionCard key={election.id} election={election} />
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