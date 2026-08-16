import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vote, Plus, Settings, Users, List, BarChart2, ArrowRight, Ban } from "lucide-react";
import AdminElectionsClient from "./AdminElectionsClient";

export const metadata: Metadata = {
  title: "Elections Management — Votara Admin",
  description: "Manage elections, clubs, candidates, and results",
};

export default function AdminElectionsPage() {
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

      <AdminElectionsClient />
    </div>
  );
}