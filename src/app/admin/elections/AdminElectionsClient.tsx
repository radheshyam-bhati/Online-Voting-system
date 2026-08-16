"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Plus, Settings, Users, List, BarChart2, ArrowRight, AlertCircle, X, Loader2, Ban, AlertTriangle, Gavel } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { voidElection } from "@/lib/actions/elections";
import { resolveTie } from "@/lib/actions/elections";

export default function AdminElectionsClient() {
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [voidingElectionId, setVoidingElectionId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  const [tieDialogOpen, setTieDialogOpen] = useState(false);
  const [tyingElectionId, setTyingElectionId] = useState<string | null>(null);
  const [tyingClubId, setTyingClubId] = useState<string | null>(null);
  const [tyingCandidateId, setTyingCandidateId] = useState<string | null>(null);
  const [tieReason, setTieReason] = useState("");
  const [tying, setTying] = useState(false);
  const [tieError, setTieError] = useState("");

  const handleVoidClick = (electionId: string) => {
    setVoidingElectionId(electionId);
    setVoidReason("");
    setVoidError("");
    setVoidDialogOpen(true);
  };

  const handleVoidSubmit = async () => {
    if (!voidingElectionId || !voidReason.trim()) {
      setVoidError("A reason is required");
      return;
    }

    setVoiding(true);
    setVoidError("");

    try {
      const result = await voidElection(voidingElectionId, voidReason);
      if (result.error) {
        setVoidError(result.error);
      } else {
        setVoidDialogOpen(false);
        setVoidingElectionId(null);
        window.location.reload();
      }
    } catch {
      setVoidError("Failed to void election");
    } finally {
      setVoiding(false);
    }
  };

  const handleTieClick = (electionId: string, clubId: string, candidateId: string) => {
    setTyingElectionId(electionId);
    setTyingClubId(clubId);
    setTyingCandidateId(candidateId);
    setTieReason("");
    setTieError("");
    setTieDialogOpen(true);
  };

  const handleTieSubmit = async () => {
    if (!tyingElectionId || !tyingClubId || !tyingCandidateId || !tieReason.trim()) {
      setTieError("A reason is required");
      return;
    }

    setTying(true);
    setTieError("");

    try {
      const result = await resolveTie(tyingElectionId, tyingClubId, tyingCandidateId, tieReason);
      if (result.error) {
        setTieError(result.error);
      } else {
        setTieDialogOpen(false);
        setTyingElectionId(null);
        setTyingClubId(null);
        setTyingCandidateId(null);
        window.location.reload();
      }
    } catch {
      setTieError("Failed to resolve tie");
    } finally {
      setTying(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Elections Management</h1>
          <p className="text-muted-foreground">Configure and manage club elections</p>
        </div>
        <Link href="/admin/elections/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Election
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/elections/create">
          <Card className="hover:shadow-lg transition-shadow h-full border-primary/30">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Create Election
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">Start a new election cycle with multi-campus support</p>
              <Button variant="outline" className="gap-2 w-full">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-lg transition-shadow h-full">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Election Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">Configure election dates, visibility, and multi-campus toggle</p>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 w-full" disabled>
                Configure
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="destructive" className="gap-2" onClick={() => handleVoidClick("current-election-id")}>
                <Ban className="w-4 h-4" />
                Void Election
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => handleTieClick("current-election-id", "current-club-id", "current-candidate-id")}>
                <Gavel className="w-4 h-4" />
                Resolve Tie
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow h-full">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clubs & Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">Manage clubs, candidates, and nomination questions per campus</p>
            <Button variant="outline" className="gap-2 w-full" disabled>
              Manage
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow h-full">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <BarChart2 className="w-5 h-5" />
              Results & Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">View real-time results, participation stats, and export data</p>
            <Button variant="outline" className="gap-2 w-full" disabled>
              View Results
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-border pt-8">
        <h2 className="font-heading text-xl font-bold text-primary mb-6">Election Lifecycle</h2>
        <div className="grid gap-4 md:grid-cols-6">
          {[
            { status: "draft", label: "Draft", icon: Settings, desc: "Configure election basics" },
            { status: "nomination", label: "Nominations", icon: Users, desc: "Self-nomination window open" },
            { status: "scheduled", label: "Scheduled", icon: List, desc: "Voting dates set, candidates locked" },
            { status: "open", label: "Open", icon: Vote, desc: "Voting in progress" },
            { status: "published", label: "Published", icon: BarChart2, desc: "Results finalized" },
            { status: "voided", label: "Voided", icon: Ban, desc: "Election voided, results invalid" },
          ].map((stage) => (
            <Card key={stage.status} className="text-center">
              <CardContent className="py-6">
                <stage.icon className={`w-8 h-8 mx-auto mb-2 ${stage.status === "voided" ? "text-destructive" : "text-primary"}`} />
                <p className="font-heading font-bold">{stage.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{stage.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Void Election
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to void this election? This action will mark the election as voided,
              making it invisible to students. Any votes already cast will remain in the database but
              will not be counted in results. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="voidReason">Reason (required)</Label>
              <Textarea
                id="voidReason"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Enter the reason for voiding this election..."
                rows={3}
                disabled={voiding}
              />
              {voidError && (
                <p className="text-sm text-red-600">{voidError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setVoidDialogOpen(false)} disabled={voiding}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleVoidSubmit} disabled={voiding} className="gap-2">
                {voiding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {voiding ? "Voiding..." : "Void Election"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={tieDialogOpen} onOpenChange={setTieDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Resolve Tie
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to resolve this tie? This action will mark the selected candidate as the winner
              for the tied club. This action cannot be undone.
            </p>
            <div className="space-y-2">
              <Label htmlFor="tieReason">Reason (required)</Label>
              <Textarea
                id="tieReason"
                value={tieReason}
                onChange={(e) => setTieReason(e.target.value)}
                placeholder="Enter the reason for resolving this tie..."
                rows={3}
                disabled={tying}
              />
              {tieError && (
                <p className="text-sm text-red-600">{tieError}</p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setTieDialogOpen(false)} disabled={tying}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleTieSubmit} disabled={tying} className="gap-2">
                {tying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {tying ? "Resolving..." : "Resolve Tie"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}