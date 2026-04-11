import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO guide pages",
  robots: { index: false, follow: false },
};

export default function AdminSeoPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
