import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "In Meeting",
};

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
