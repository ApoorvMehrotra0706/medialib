import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";

export const metadata: Metadata = {
  title: "Medialib",
  description: "Your personal media library — books, movies, TV, games, anime",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full" style={{ background: "#f3f4f6", color: "#111827" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
