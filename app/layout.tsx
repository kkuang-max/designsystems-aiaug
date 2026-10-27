import type { Metadata } from "next";
import "./globals.css";
import "./studio-layout.css";

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
      <body>{children}</body>
    </html>
  );
}
