import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Vote, Calendar, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getElectionForVoting } from "@/lib/actions/elections";
import { VoteForm } from "./VoteForm";

interface VotePageProps {
  params: Promise<{ electionId: string; clubId: string }>;
}

export async function generateMetadata({ params }: VotePageProps): Promise<Metadata> {
  const { electionId, clubId } = await params;
  return {
    title: `Vote — Election`,
    description: "Cast your vote for club representatives",
  };
}

async function VoteContent({ params }: VotePageProps) {
  const { electionId, clubId } = await params;
  const electionData = await getElectionForVoting(electionId);

  if (!electionData) {
    notFound();
  }

  const club = electionData.clubs.find(c => c.id === clubId);
  if (!club) {
    notFound();
  }

  if (club.hasVoted) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <header className="border-b border-border">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="font-heading text-2xl font-bold text-primary">
              Votara
            </Link>
          </nav>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center gap-3 mb-6" role="alert">
              <Vote className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-green-800">Already Voted</p>
                <p className="text-green-700 text-sm mt-1">You have already cast your vote for {club.name}.</p>
              </div>
            </div>
            <Link href="/elections">
              <Button className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Elections
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading text-2xl font-bold text-primary">
            Votara
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/elections" className="text-sm font-medium text-primary">Elections</Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link href="/elections" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Elections
        </Link>

        <div className="max-w-3xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">Voting Open</Badge>
              <Badge variant="outline" className="text-xs capitalize">{electionData.election.multiCampus ? "Multi-Campus" : "Single Campus"}</Badge>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-2">
              Vote for {club.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Voting: {format(new Date(electionData.election.startsAt!), "EEEE, MMMM d, yyyy")}
              </span>
              {electionData.election.endsAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Ends: {format(new Date(electionData.election.endsAt!), "MMM d, yyyy h:mm a")}
                </span>
              )}
            </div>
          </header>

          <VoteForm 
            electionId={electionId} 
            clubId={clubId} 
            clubName={club.name} 
            candidates={club.candidates} 
          />
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default VoteContent;