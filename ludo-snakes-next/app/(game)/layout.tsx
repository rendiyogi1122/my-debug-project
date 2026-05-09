import { Navbar } from "@/components/layout/navbar";

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}