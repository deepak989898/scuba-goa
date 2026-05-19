import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog automation | Admin",
  robots: { index: false, follow: false },
};

export default function BlogAutomationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
