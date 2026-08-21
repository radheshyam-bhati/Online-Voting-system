import { Metadata } from "next";
import { JoinForm } from "./JoinForm";

export const metadata: Metadata = {
  title: "Join",
  description: "Become part of our community. Fill out the form below and we'll review your request.",
};

export default function JoinPage() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <JoinForm />
    </main>
  );
}