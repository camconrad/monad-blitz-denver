import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trade",
};

export default function TradeLayout({
  children,
}: { children: React.ReactNode }) {
  return children;
}
