import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminElections } from "@/lib/actions/elections";
import { AdminCandidatesClient } from "./AdminCandidatesClient";

interface AdminCandidatesPageProps {
  params: Promise<{ electionId: string }>;
}

export async function generateMetadata({ params }: AdminCandidatesPageProps): Promise<Metadata> {
  const { electionId } = await params;
  return {
    title: "Clubs & Candidates — Election Management",
    description: "Manage clubs, candidates, and nomination questions",
  };
}

export default async function AdminCandidatesPage({ params }: AdminCandidatesPageProps) {
  const { electionId } = await params;

  const elections = await getAdminElections();
  const election = elections.find(e => e.id === electionId);

  if (!election) {
    notFound();
  }

  return <AdminCandidatesClient election={election} />;
}