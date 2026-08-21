"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { submitJoinRequest } from "@/lib/actions/public";

export function JoinForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    enrollmentNo: "",
    contactEmail: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    setSuccessMessage("");

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, value);
    });

    try {
      const result = await submitJoinRequest(formDataToSend);

      if (result.error) {
        setStatus("error");
        setError(result.error);
      } else {
        setStatus("success");
        setSuccessMessage("Your membership request has been submitted! We'll review it and get back to you soon.");
        setFormData({ fullName: "", enrollmentNo: "", contactEmail: "", message: "" });
      }
    } catch {
      setStatus("error");
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="text-center mb-12">
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-primary mb-4">
          Join Votara
        </h1>
        <p className="text-xl text-muted-foreground">
          Become part of our community. Fill out the form below and we&apos;ll review your request.
        </p>
      </header>

      {status === "success" && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3" role="alert">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Request Submitted!</p>
            <p className="text-green-700 text-sm mt-1">{successMessage}</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">Membership Request</CardTitle>
          <CardDescription>
            All fields are required. We&apos;ll use your enrollment number to verify eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
                disabled={status === "submitting"}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentNo">Enrollment Number</Label>
              <Input
                id="enrollmentNo"
                name="enrollmentNo"
                type="text"
                placeholder="STU2024001"
                value={formData.enrollmentNo}
                onChange={handleChange}
                required
                disabled={status === "submitting"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="you@college.edu"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                disabled={status === "submitting"}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Why do you want to join? (Optional)</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us a bit about yourself and why you&apos;re interested in joining Votara..."
                value={formData.message}
                onChange={handleChange}
                rows={4}
                disabled={status === "submitting"}
              />
            </div>

            <Button type="submit" className="w-full" disabled={status === "submitting"}>
              {status === "submitting" && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {status === "submitting" ? "Submitting..." : "Submit Request"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-primary">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>Questions? Contact us at <a href="mailto:admin@votara.club" className="underline hover:text-primary">admin@votara.club</a></p>
      </div>
    </div>
  );
}