import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "oru-meet — Premium Video Meetings",
    template: "%s | oru-meet",
  },
  description:
    "A premium video meeting platform for professionals and teams. Create or join a meeting with a single click.",
  keywords: ["video conferencing", "online meeting", "team collaboration", "video call"],
  authors: [{ name: "oru-meet" }],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    title: "oru-meet — Premium Video Meetings",
    description: "Create or join a professional video meeting instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en" className={inter.variable}>
        <body className="min-h-dvh flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
