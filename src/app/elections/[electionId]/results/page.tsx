import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, Calendar, ArrowLeft, BarChart2, Users, Trophy, AlertCircle, AlertTriangle } from "lucide-react";
import { getElectionResults } from "@/lib/actions/elections";

interface ResultsPageProps {
  params: Promise<{ electionId: string }>;
}

export async function generateMetadata({ params }: ResultsPageProps): Promise<Metadata> {
  const { electionId } = await params;
  return {
    title: `Results — Election`,
    description: "View election results and participation statistics",
  };
}

async function ResultsContent({ params }: ResultsPageProps) {
  const { electionId } = await params;
  
  try {
    const resultsData = await getElectionResults(electionId);
    
    if (!resultsData) {
      notFound();
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

          <div className="max-w-4xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default">Results Published</Badge>
                {resultsData.election.multiCampus && (
                  <Badge variant="outline" className="text-xs capitalize">Multi-Campus</Badge>
                )}
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-2">
                {resultsData.election.name} — Results
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Voting: {format(new Date(resultsData.election.startsAt!), "EEEE, MMMM d, yyyy")}
                </span>
                {resultsData.election.endsAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Ended: {format(new Date(resultsData.election.endsAt!), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            </header>

            <div className="space-y-8">
              {resultsData.results.map((clubResult, index) => (
                <Card key={clubResult.clubId} className={index === 0 ? "border-accent/30" : ""}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {index === 0 ? <Trophy className="w-5 h-5 text-accent" /> : <Users className="w-5 h-5 text-primary" />}
                        </div>
                        <div>
                          <CardTitle className="font-heading text-xl">{clubResult.clubName}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {clubResult.totalVotes} total vote{clubResult.totalVotes !== 1 ? "s" : ""}
                            {clubResult.campusName && ` • ${clubResult.campusName}`}
                          </p>
                        </div>
                      </div>
                      {index === 0 && !clubResult.isTied && (
                        <Badge variant="default" className="gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Winner
                        </Badge>
                      )}
                      {clubResult.isTied && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1 border-amber-300 text-amber-800 bg-amber-50">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Tied
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {clubResult.tieBreakPolicy === "revote" 
                              ? "Manual review required — revote flow not yet implemented" 
                              : "Pending manual resolution"}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
{clubResult.candidates.map((candidate, candidateIndex) => {
                        const percentage = clubResult.totalVotes > 0 
                          ? ((candidate.voteCount || 0) / clubResult.totalVotes) * 100 
                          : 0;
                        const isTied = clubResult.isTied && clubResult.tiedCandidates?.includes(candidate.id);
                        const isWinner = candidateIndex === 0 && clubResult.totalVotes > 0 && !clubResult.isTied;

                        return (
                          <div key={candidate.id} className={`p-4 rounded-lg ${isTied ? "bg-amber-50 border-2 border-amber-300" : isWinner ? "bg-primary/5 border border-primary/20" : "bg-card border border-border"}`}>
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center">
                                {isTied ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center">
                                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                                  </div>
                                ) : isWinner ? (
                                  <div className="w-5 h-5 rounded-full bg-accent" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-primary/20" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium">{candidate.name}</h4>
                                  {isTied && (
                                    <Badge variant="outline" className="gap-1 text-xs border-amber-300 text-amber-800 bg-amber-50">
                                      <AlertTriangle className="w-3 h-3" />
                                      Tied
                                    </Badge>
                                  )}
                                  {isWinner && (
                                    <Badge variant="default" className="gap-1 text-xs">
                                      <Trophy className="w-3 h-3" />
                                      Winner
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {candidate.publicStatement || "No statement provided"}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 text-right">
                                <div className="w-32">
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right min-w-[80px]">
                                  <p className="font-heading font-bold text-xl text-primary">{candidate.voteCount || 0}</p>
                                  <p className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-border py-8 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Votara. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background font-sans flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Vote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="font-heading text-2xl font-bold text-primary mb-2">Results Not Available</h2>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Unable to load election results."}
          </p>
          <Link href="/elections">
            <Button className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Elections
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}

export default ResultsContent;