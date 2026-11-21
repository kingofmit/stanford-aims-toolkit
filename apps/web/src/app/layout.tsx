import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIMS Toolkit — AI Methods for Social Scientists",
  description:
    "No-code NLP, topic modeling, sentiment analysis, and qualitative coding for social science research.",
  icons: {
    icon: "/aims-logo.png",
    apple: "/aims-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
