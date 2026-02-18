import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coach",
};

export default function CoachLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
