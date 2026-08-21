"use client";

import { useState } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Loader2 } from "lucide-react";
import { createElection } from "@/lib/actions/elections";

export function CreateElectionForm() {
  const [formData, setFormData] = useState({
    name: "",
    multiCampus: false,
    nominationStartsAt: "",
    nominationEndsAt: "",
    startsAt: "",
    endsAt: "",
    resultsVisibility: "members_only",
    tieBreakPolicy: "manual_review",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (type === "datetime-local") {
      setFormData(prev => ({ ...prev, [name]: value || "" }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value || "" }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const result = await createElection({
        name: formData.name,
        multiCampus: formData.multiCampus,
        nominationStartsAt: formData.nominationStartsAt ? new Date(formData.nominationStartsAt) : undefined,
        nominationEndsAt: formData.nominationEndsAt ? new Date(formData.nominationEndsAt) : undefined,
        startsAt: formData.startsAt ? new Date(formData.startsAt) : undefined,
        endsAt: formData.endsAt ? new Date(formData.endsAt) : undefined,
        resultsVisibility: formData.resultsVisibility as "public" | "members_only" | "admin_only",
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        redirect("/admin/elections");
      }
    } catch {
      setError("Failed to create election. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-xl">Election Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm" role="alert">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Election Name (Required)</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Student Council Election 2026"
                required
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiCampus">Multi-Campus Election</Label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="multiCampus"
                  name="multiCampus"
                  type="checkbox"
                  checked={formData.multiCampus}
                  onChange={handleCheckboxChange}
                  disabled={submitting}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                />
                <span className="text-sm text-muted-foreground">
                  Enable campus-specific clubs and voters
                </span>
              </label>
                <span className="text-sm text-muted-foreground">
                  Enable campus-specific clubs and voters
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nominationStartsAt">Nomination Opens</Label>
                <Input
                  id="nominationStartsAt"
                  name="nominationStartsAt"
                  type="datetime-local"
                  value={formData.nominationStartsAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominationEndsAt">Nomination Closes</Label>
                <Input
                  id="nominationEndsAt"
                  name="nominationEndsAt"
                  type="datetime-local"
                  value={formData.nominationEndsAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Voting Opens</Label>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Voting Closes</Label>
                <Input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  value={formData.endsAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resultsVisibility">Results Visibility</Label>
              <Select value={formData.resultsVisibility} onValueChange={(v) => setFormData(prev => ({ ...prev, resultsVisibility: v || "members_only" }))} disabled={submitting}>
                <SelectTrigger className="focus-ring">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — Anyone can view results</SelectItem>
                  <SelectItem value="members_only">Members Only — Logged-in members only</SelectItem>
                  <SelectItem value="admin_only">Admin Only — Only admins can view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tieBreakPolicy">Tie-Break Policy</Label>
              <Select value={formData.tieBreakPolicy} onValueChange={(v) => setFormData(prev => ({ ...prev, tieBreakPolicy: v || "manual_review" }))} disabled={submitting}>
                <SelectTrigger className="focus-ring">
                  <SelectValue placeholder="Select tie-break policy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_review">Manual Review — Admin resolves ties</SelectItem>
                  <SelectItem value="revote">Revote — Trigger a new voting period (not yet implemented)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Link href="/admin/elections">
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? "Creating..." : "Create Election"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}