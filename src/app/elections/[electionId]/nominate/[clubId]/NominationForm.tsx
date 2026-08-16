"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitNomination } from "@/lib/actions/elections";
import { Vote, Calendar, Clock, ArrowLeft, Loader2, AlertCircle, CheckCircle, Image as ImageIcon, X } from "lucide-react";

interface NominationFormProps {
  electionId: string;
  clubId: string;
  clubName: string;
  questions: Array<{ id: string; questionText: string; displayOrder: number }>;
  election: {
    multiCampus: boolean;
    nominationStartsAt: string | null;
    nominationEndsAt: string | null;
  };
}

export function NominationForm({ electionId, clubId, clubName, questions, election }: NominationFormProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setPhotoFile(file);
    setError("");
    
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const removePhoto = () => {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);

      const response = await fetch("/api/candidates/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      return data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async () => {
    if (questions.length > 0 && Object.keys(answers).length !== questions.length) {
      setError("Please answer all nomination questions");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let photoUrl: string | null = null;
      if (photoFile) {
        photoUrl = await uploadPhoto();
        if (!photoUrl) {
          setSubmitting(false);
          return;
        }
      }

      const result = await submitNomination(electionId, clubId, 
        questions.map(q => ({ questionId: q.id, answerText: answers[q.id] || "" })),
        photoUrl || undefined
      );

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
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
        <h2 className="font-heading text-3xl font-bold text-green-800 mb-2">Nomination Submitted!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your self-nomination for {clubName} has been received. You will be notified once nominations close.
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
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Self-Nomination Form</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Complete the form below to nominate yourself for {clubName}. All fields are required unless marked optional.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label className="font-medium">Photo (Optional)</Label>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-full border-2 border-border overflow-hidden flex-shrink-0 bg-muted/50">
              {photoPreview ? (
                <img src={photoPreview} alt="Candidate photo preview" className="w-full h-full object-cover" />
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
                disabled={submitting || uploadingPhoto}
                className="file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional candidate photo. Max 5MB. JPEG, PNG, or WebP.
              </p>
              {photoPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removePhoto}
                  className="mt-2 text-destructive hover:text-destructive gap-1"
                >
                  <X className="w-3 h-3" />
                  Remove photo
                </Button>
              )}
            </div>
          </div>
        </div>

        {questions.length > 0 && (
          <div className="space-y-6 border-t border-border pt-6">
            <h3 className="font-heading text-lg font-semibold">Nomination Questions</h3>
            <div className="space-y-4">
              {questions
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((question) => (
                  <div key={question.id} className="space-y-2">
                    <Label htmlFor={`answer-${question.id}`} className="font-medium">
                      {question.questionText}
                    </Label>
                    <Textarea
                      id={`answer-${question.id}`}
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Your answer..."
                      rows={3}
                      disabled={submitting}
                      className="focus-ring"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800" role="alert">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-border">
          <Link href="/elections">
            <Button variant="outline" className="flex-1" disabled={submitting}>
              <ArrowLeft className="w-4 h-4" />
              Cancel
            </Button>
          </Link>
          <Button 
            variant="default" 
            className="flex-1 gap-2" 
            size="lg" 
            onClick={handleSubmit} 
            disabled={submitting || uploadingPhoto}
          >
            {(submitting || uploadingPhoto) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {uploadingPhoto ? "Uploading Photo..." : submitting ? "Submitting..." : "Submit Nomination"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}