import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNominationQuestions } from "@/lib/actions/elections";
import { getElectionForNomination } from "@/lib/actions/elections";
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

export default async function NominationPage({ params }: NominationPageProps) {
  const { electionId, clubId } = await params;

  try {
    const [questions, electionData] = await Promise.all([
      getNominationQuestions(clubId),
      getElectionForNomination(electionId),
    ]);

    const club = electionData.clubs?.find((c: { id: string }) => c.id === clubId);

    if (!club) {
      notFound();
    }

    return <NominationForm electionId={electionId} clubId={clubId} clubName={club.name} questions={questions} election={electionData.election} />;
  } catch {
    notFound();
  }
}