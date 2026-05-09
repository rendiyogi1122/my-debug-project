import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import Image from "next/image";
import Link from "next/link";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user!.id)
    .single();

  return (
    <nav style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)",
      borderBottom:"1.5px solid var(--border)", position:"sticky", top:0, zIndex:50 }}>
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">

        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-2xl animate-float inline-block">🎲</span>
          <span className="font-semibold text-base" style={{ color:"var(--t1)" }}>Ludo Snakes</span>
        </Link>

        <div className="flex items-center gap-3">
          {profile?.avatar_url && (
            <Image src={profile.avatar_url} alt={profile.name ?? "Avatar"}
              width={34} height={34}
              className="rounded-full"
              style={{ border:"2px solid var(--pp-l)", boxShadow:"0 2px 8px rgba(124,111,247,0.2)" }} />
          )}
          <span className="text-sm hidden sm:block font-medium" style={{ color:"var(--t1)" }}>
            {profile?.name}
          </span>
          <form action={signOut}>
            <button type="submit"
              className="text-xs px-3 py-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
              style={{ background:"var(--pk-l)", color:"#BE185D", border:"1.5px solid rgba(244,114,182,0.2)" }}>
              Keluar
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}