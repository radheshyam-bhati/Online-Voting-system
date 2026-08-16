import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About Us — Votara",
  description: "Learn about Votara's mission, history, and what we do as a college club.",
};

export default function AboutPage() {
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
            <Link href="/join" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Join
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <section className="mb-20">
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-primary mb-6">
            About Votara
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mb-8">
            Votara is a student-led college club dedicated to fostering innovation, collaboration,
            and leadership among students. We provide a platform for students to explore their
            interests, develop new skills, and make meaningful connections.
          </p>
        </section>

        <section className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 mb-20">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Our Mission</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To empower students through technology, leadership opportunities, and community
                engagement — creating the next generation of innovators and change-makers.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Our Vision</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A vibrant, inclusive student community where every member can grow, contribute,
                and lead — regardless of their background or experience level.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Our Values</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-muted-foreground space-y-2 list-disc list-inside">
                <li>Innovation through collaboration</li>
                <li>Inclusive leadership</li>
                <li>Continuous learning</li>
                <li>Community first</li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="mb-20">
          <h2 className="font-heading text-3xl font-bold text-primary mb-6">Our Story</h2>
          <div className="prose text-muted-foreground max-w-3xl space-y-4">
            <p>
              Votara was founded in 2024 by a group of passionate students who saw a need for a
              central hub where students could discover opportunities, connect with peers, and
              participate in campus democracy through fair, transparent elections.
            </p>
            <p>
              What started as a small initiative to improve club communication has grown into a
              comprehensive platform serving thousands of students across multiple campuses. Our
              integrated election system ensures that every student&apos;s voice is heard and counted
              with integrity — no duplicate votes, no manual counting errors, just fair results.
            </p>
            <p>
              Today, Votara continues to evolve based on student feedback and needs. We&apos;re
              committed to building tools that make campus life better, one feature at a time.
            </p>
          </div>
        </section>

        <section className="text-center">
          <Link href="/join">
            <Button size="lg" className="gap-2">
              Join Our Community
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-border py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 Votara. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}