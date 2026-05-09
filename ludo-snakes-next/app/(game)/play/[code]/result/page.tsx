import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { GameState } from "@/types/database";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { code } = await params;

  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_players(user_id, color, profiles(name, avatar_url))")
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room) redirect("/dashboard");

  const state  = room.state as GameState | null;
  const winner = state?.winner;
  const winnerPlayer = room.room_players.find((p: any) => p.user_id === winner);

  const DOT: Record<string, string> = {
    red:"#EF4444", blue:"#3B82F6", green:"#22C55E", yellow:"#F59E0B",
  };
  const MEDALS = ["🥇","🥈","🥉","🏅"];

  const ranked = state?.players
    .sort((a, b) => {
      if (a.finished && !b.finished) return -1;
      if (!a.finished && b.finished) return 1;
      return b.position - a.position;
    }) ?? [];

  return (
    <div className="max-w-md mx-auto space-y-5 animate-fade-up">

      {/* Confetti + trophy */}
      <div className="text-center py-6 relative">
        <ConfettiClient />
        <div className="text-7xl animate-float inline-block mb-3">🏆</div>
        <h1 className="text-2xl font-semibold" style={{ color:"var(--t1)" }}>Game Selesai!</h1>
        <p className="text-sm mt-1" style={{ color:"var(--t2)" }}>Permainan yang seru banget! 🎉</p>
      </div>

      {/* Pemenang */}
      {winnerPlayer && (
        <div className="rounded-3xl p-6 text-center"
          style={{ background:"linear-gradient(135deg,#FFFBEB,#FFF7ED)",
            border:"2px solid rgba(251,191,36,.4)",
            boxShadow:"0 6px 24px rgba(251,191,36,.2)" }}>
          <div className="text-5xl mb-3">🎊</div>
          <p className="text-xl font-semibold" style={{ color:"#92400E" }}>
            {winnerPlayer.profiles?.name}
          </p>
          <p className="text-sm mt-1" style={{ color:"#B45309" }}>
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5"
              style={{ background: DOT[winnerPlayer.color] ?? "#888", verticalAlign:"middle" }} />
            Pion {winnerPlayer.color === "red" ? "Merah" : winnerPlayer.color === "blue" ? "Biru" : winnerPlayer.color === "green" ? "Hijau" : "Kuning"}
          </p>
          <span className="inline-block mt-3 px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background:"var(--am-l)", color:"#92400E" }}>
            🥇 Pemenang!
          </span>
        </div>
      )}

      {/* Klasemen */}
      <div className="rounded-3xl border p-5"
        style={{ background:"var(--card)", borderColor:"var(--border)" }}>
        <h2 className="font-semibold text-base mb-4" style={{ color:"var(--t1)" }}>Klasemen Akhir</h2>
        <div className="space-y-2.5">
          {ranked.map((p, i) => {
            const rp = room.room_players.find((r: any) => r.user_id === p.user_id);
            const isMe = p.user_id === user.id;
            return (
              <div key={p.user_id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: i === 0 ? "var(--am-l)" : "var(--bg)" }}>
                <span className="text-lg w-7 text-center">{MEDALS[i] ?? "🏅"}</span>
                <div className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: DOT[p.color] ?? "#888" }} />
                <div className="flex-1">
                  <span className="text-sm font-medium" style={{ color:"var(--t1)" }}>
                    {rp?.profiles?.name ?? p.color}
                  </span>
                  {isMe && <span className="text-xs ml-1" style={{ color:"var(--t3)" }}>(kamu)</span>}
                </div>
                <span className="text-xs" style={{ color:"var(--t2)" }}>
                  {p.finished ? "✓ Finish" : p.left ? "Keluar" : `Kotak ${p.position}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tombol */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard"
          className="py-3.5 rounded-2xl text-sm font-semibold text-center transition-all hover:scale-[1.02]"
          style={{ background:"var(--pp)", color:"#fff",
            boxShadow:"0 4px 14px rgba(124,111,247,.35)" }}>
          🔄 Main Lagi
        </Link>
        <Link href="/dashboard"
          className="py-3.5 rounded-2xl text-sm font-semibold text-center transition-all hover:scale-[1.02]"
          style={{ background:"var(--pp-l)", color:"var(--pp)",
            border:"1.5px solid rgba(124,111,247,.2)" }}>
          🏠 Dashboard
        </Link>
      </div>
    </div>
  );
}

function ConfettiClient() {
  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}
      dangerouslySetInnerHTML={{ __html:`
        <style>
          @keyframes cf { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(300px) rotate(700deg);opacity:0} }
          .cf { position:absolute; width:8px; height:8px; border-radius:2px; animation: cf 1.6s ease forwards; }
        </style>
        ${["#7C6FF7","#F472B6","#2DD4BF","#FBBF24","#86EFAC","#FCA5A5"].flatMap((c,i) =>
          Array.from({length:6}, (_,j) => `<div class="cf" style="left:${Math.round((i*6+j)*2.8)}%;background:${c};animation-delay:${(i*6+j)*0.06}s;animation-duration:${1.3+(i*6+j)%4*0.15}s"></div>`)).join("")}
      `}} />
  );
}