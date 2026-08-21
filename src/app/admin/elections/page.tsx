import { Metadata } from "next";
import AdminElectionsClient from "./AdminElectionsClient";

export const metadata: Metadata = {
  title: "Elections Management — Votara Admin",
  description: "Manage elections, clubs, candidates, and results",
};

export default function AdminElectionsPage() {
  return <AdminElectionsClient />;
}