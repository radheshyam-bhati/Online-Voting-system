import { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Enter your new password to complete the reset process",
};

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <ResetPasswordForm />
    </main>
  );
}