import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNominationQuestions } from "@/lib/actions/elections";
import { NominationForm } from "./NominationForm";

interface NominationPageProps {
  params: Promise<{ electionId: string; clubId: string }>;
}

export async function generateMetadata({ params }: NominationPageProps): Promise<Metadata> {
  const { electionId, clubId } = await params;
  return {
    title: `Nominate Yourself — Election`,
    description: "Submit your self-nomination for a club position",
  };
}

async function getElectionData(electionId: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/elections/${electionId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function NominationPage({ params }: NominationPageProps) {
  const { electionId, clubId } = await params;

  const [questions, election] = await Promise.all([
    getNominationQuestions(clubId),
    getElectionData(electionId),
  ]);

  if (!election || !election.id) {
    notFound();
  }

  const club = election.clubs?.find((c: { id: string }) => c.id === clubId);

  if (!club) {
    notFound();
  }

  return <NominationForm electionId={electionId} clubId={clubId} clubName={club.name} questions={questions} election={election} />;
}