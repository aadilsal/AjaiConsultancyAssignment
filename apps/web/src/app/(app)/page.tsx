import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Dashboard } from "@/components/dashboard";

export const metadata: Metadata = {
  title: "Documents",
  description: "Your documents and the ones shared with you.",
};

export default function HomePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-[960px] px-4 py-8">
        <Dashboard />
      </main>
    </>
  );
}
