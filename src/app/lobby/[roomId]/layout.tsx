import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Joining Meeting",
  description: "Preview your camera and microphone before joining the meeting.",
};

export default function LobbyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
