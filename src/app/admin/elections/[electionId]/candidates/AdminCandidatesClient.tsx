"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Vote, Plus, Settings, Users, List, BarChart2, ArrowRight, AlertCircle, X, Loader2, 
  Edit, Trash2, Image as ImageIcon, Upload, X as XIcon, Save, ChevronLeft
} from "lucide-react";
import { addCandidate, updateCandidate, deleteCandidate } from "@/lib/actions/elections";

interface Candidate {
  id: string;
  name: string;
  publicStatement: string | null;
  photoUrl: string | null;
  selfNominated: boolean;
  createdAt: string;
}

interface Club {
  id: string;
  name: string;
  campusId: string | null;
  campusName: string | null;
  candidates: Candidate[];
}

interface AdminCandidatesClientProps {
  election: {
    id: string;
    name: string;
    status: string;
    multiCampus: boolean;
  };
}

export function AdminCandidatesClient({ election }: AdminCandidatesClientProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("clubs");

  const [addCandidateDialogOpen, setAddCandidateDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateForm, setCandidateForm] = useState({
    clubId: "",
    name: "",
    publicStatement: "",
    photoFile: null as File | null,
    photoPreview: null as string | null,
  });
  
const handleClubChange = (v: string | null) => {
    setCandidateForm(prev => ({ ...prev, clubId: v || "" }));
  };
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [clubsRes, campusesRes] = await Promise.all([
        fetch(`/api/admin/elections/${election.id}/clubs`),
        fetch("/api/admin/campuses"),
      ]);
      const [clubsData, campusesData] = await Promise.all([
        clubsRes.json(),
        campusesRes.json(),
      ]);
      setClubs(clubsData);
      setCampuses(campusesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setCandidateForm(prev => ({ ...prev, photoFile: file }));
    setError("");
    
    const previewUrl = URL.createObjectURL(file);
    setCandidateForm(prev => ({ ...prev, photoPreview: previewUrl }));
  };

  const removePhoto = () => {
    setCandidateForm(prev => {
      if (prev.photoPreview) {
        URL.revokeObjectURL(prev.photoPreview);
      }
      return { ...prev, photoFile: null, photoPreview: null };
    });
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/candidates/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  };

  const handleAddCandidate = () => {
    setCandidateForm({ clubId: "", name: "", publicStatement: "", photoFile: null, photoPreview: null });
    setEditingCandidate(null);
    setError("");
    setAddCandidateDialogOpen(true);
  };

  const handleEditCandidate = (candidate: Candidate, clubId: string) => {
    setCandidateForm({ 
      clubId, 
      name: candidate.name, 
      publicStatement: candidate.publicStatement || "", 
      photoFile: null, 
      photoPreview: candidate.photoUrl 
    });
    setEditingCandidate(candidate);
    setError("");
    setAddCandidateDialogOpen(true);
  };

  const handleSaveCandidate = async () => {
    if (!candidateForm.clubId || !candidateForm.name.trim()) {
      setError("Club and name are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let photoUrl = editingCandidate?.photoUrl || null;
      
      if (candidateForm.photoFile) {
        photoUrl = await uploadPhoto(candidateForm.photoFile);
        if (!photoUrl) {
          setSubmitting(false);
          return;
        }
      } else if (!editingCandidate && candidateForm.photoPreview) {
        photoUrl = candidateForm.photoPreview;
      }

      if (editingCandidate) {
        const result = await updateCandidate(editingCandidate.id, {
          name: candidateForm.name,
          publicStatement: candidateForm.publicStatement || null,
          photoUrl,
        });
        if (result.error) throw new Error(result.error);
      } else {
        const result = await addCandidate({
          electionId: election.id,
          clubId: candidateForm.clubId,
          name: candidateForm.name,
          publicStatement: candidateForm.publicStatement || undefined,
          photoUrl: photoUrl || undefined,
        });
        if (result.error) throw new Error(result.error);
      }

      setAddCandidateDialogOpen(false);
      setEditingCandidate(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save candidate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm("Are you sure you want to delete this candidate? This action cannot be undone.")) {
      return;
    }

    try {
      const result = await deleteCandidate(candidateId);
      if (result.error) throw new Error(result.error);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete candidate");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/elections">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-3xl font-bold text-primary">{election.name}</h1>
            <p className="text-muted-foreground">Manage clubs and candidates</p>
          </div>
        </div>
        <Badge variant={election.status === "open" ? "default" : election.status === "nomination" ? "secondary" : "outline"} className="text-sm capitalize">
          {election.status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clubs">Clubs & Candidates</TabsTrigger>
          <TabsTrigger value="questions">Nomination Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="clubs" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Clubs & Candidates</h2>
            <Button onClick={handleAddCandidate} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Candidate
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : clubs.length === 0 ? (
            <Card className="border-border">
              <CardContent className="py-12 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-heading text-lg text-muted-foreground mb-2">No clubs configured</h3>
                <p className="text-muted-foreground mb-6">Add clubs to this election first from the election settings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {clubs.map((club) => (
                <Card key={club.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-lg">{club.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {club.campusName ? `${club.campusName} · ` : ""}{club.candidates.length} candidate{club.candidates.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {club.candidates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No candidates yet</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {club.candidates.map((candidate) => (
                          <div key={candidate.id} className="candidate-card group relative">
                            <div className="aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border mb-3 relative">
                              {candidate.photoUrl ? (
                                <img src={candidate.photoUrl} alt={candidate.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                  <span className="font-heading text-2xl font-bold text-primary">{getInitials(candidate.name)}</span>
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 bg-background/90 hover:bg-background"
                                  onClick={(e) => { e.stopPropagation(); handleEditCandidate(candidate, club.id); }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 bg-background/90 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(candidate.id); }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <h4 className="font-heading font-semibold text-sm truncate">{candidate.name}</h4>
                            {candidate.publicStatement && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{candidate.publicStatement}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {candidate.selfNominated && (
                                <Badge variant="outline" className="text-xs">Self-nominated</Badge>
                              )}
                              {!candidate.photoUrl && (
                                <span className="text-muted-foreground/50">No photo</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-6">
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-heading text-lg text-muted-foreground mb-2">Nomination Questions</h3>
              <p className="text-muted-foreground mb-6">Manage nomination questions per club (coming soon)</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={addCandidateDialogOpen} onOpenChange={setAddCandidateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading">
              {editingCandidate ? "Edit Candidate" : "Add Candidate"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clubId">Club (Required)</Label>
              <Select value={candidateForm.clubId} onValueChange={handleClubChange} disabled={!!editingCandidate}>
                <SelectTrigger className="focus-ring">
                  <SelectValue placeholder="Select club" />
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((club) => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (Required)</Label>
              <Input
                id="name"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Candidate name"
                disabled={submitting}
                className="focus-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicStatement">Public Statement (Optional)</Label>
              <Textarea
                id="publicStatement"
                value={candidateForm.publicStatement}
                onChange={(e) => setCandidateForm(prev => ({ ...prev, publicStatement: e.target.value }))}
                placeholder="Candidate's public statement..."
                rows={3}
                disabled={submitting}
                className="focus-ring"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Photo (Optional)</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-lg border-2 border-border overflow-hidden flex-shrink-0 bg-muted/50">
                  {candidateForm.photoPreview ? (
                    <img src={candidateForm.photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    disabled={submitting}
                    className="file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 5MB. JPEG, PNG, or WebP.</p>
                  {candidateForm.photoPreview && candidateForm.photoFile && (
                    <Button type="button" variant="ghost" size="sm" onClick={removePhoto} className="mt-2 text-destructive hover:text-destructive gap-1">
                      <XIcon className="w-3 h-3" />
                      Remove photo
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setAddCandidateDialogOpen(false); setEditingCandidate(null); }} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleSaveCandidate} disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? "Saving..." : editingCandidate ? "Save Changes" : "Add Candidate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}