"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, AlertCircle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import { castVote } from "@/lib/actions/elections";

interface VoteFormProps {
  electionId: string;
  clubId: string;
  clubName: string;
  candidates: Array<{ 
    id: string; 
    name: string; 
    publicStatement: string | null; 
    photoUrl: string | null; 
    statementStatus: string 
  }>;
}

export function VoteForm({ electionId, clubId, clubName, candidates }: VoteFormProps) {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCandidate) {
      setError("Please select a candidate");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await castVote(electionId, clubId, selectedCandidate);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        setConfirming(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="font-heading text-3xl font-bold text-green-800 mb-2">Vote Submitted!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your vote for {clubName} has been recorded securely. Thank you for participating in the election.
        </p>
        <Link href="/elections">
          <Button className="gap-2" size="lg">
            <ArrowLeft className="w-4 h-4" />
            Back to Elections Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <h3 className="font-medium mb-2">Select one candidate</h3>
        <p className="text-sm text-muted-foreground">
          Review each candidate's statement before making your choice. You can only vote once for this club.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800" role="alert">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      <div className="grid gap-4">
        {candidates.map((candidate) => (
          <Card
            key={candidate.id}
            className={`relative cursor-pointer transition-all ${
              selectedCandidate === candidate.id ? "border-2 border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
            }`}
            onClick={() => !confirming && setSelectedCandidate(candidate.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-primary/50 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading font-bold text-lg">{candidate.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {candidate.publicStatement || candidate.statementStatus === "pending" ? "Statement coming soon..." : candidate.publicStatement}
                  </p>
                  {candidate.statementStatus === "pending" && (
                    <Badge variant="outline" className="mt-2 text-xs">Pending Review</Badge>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {selectedCandidate === candidate.id ? (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary-foreground" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-muted flex items-center justify-center text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCandidate && !confirming && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="font-medium text-amber-800 mb-2">
            You selected: {candidates.find(c => c.id === selectedCandidate)?.name}
          </p>
          <p className="text-sm text-amber-700 mb-4">
            Are you sure you want to cast your vote for this candidate? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => setConfirming(true)} className="flex-1 gap-2" size="lg">
              <Vote className="w-4 h-4" />
              Confirm Vote
            </Button>
            <Button variant="outline" onClick={() => setSelectedCandidate(null)} className="flex-1">
              Change Selection
            </Button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Final Confirmation</p>
              <p className="text-sm text-red-700">
                Once confirmed, your vote for <strong>{candidates.find(c => c.id === selectedCandidate)?.name}</strong> 
                in <strong>{clubName}</strong> will be permanently recorded and cannot be changed.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2" size="lg">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? "Submitting..." : "I Confirm - Cast My Vote"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} className="flex-1" disabled={submitting}>
              Go Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}