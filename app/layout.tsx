import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VibeCraft",
  description: "Turn a feeling into a design system. Explore color, typography, shape, and motion in a live studio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
