import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createRoom } from "@/lib/actions/room";
import { InviteListener } from "@/components/game/invite-listener";
import { JoinRoomInput } from "@/components/game/join-room-input";

const ERR: Record<string, string> = {
  invalid_code: "Kode room tidak valid.",
  room_not_found: "Room tidak ditemukan atau sudah dimulai.",
  room_full: "Room sudah penuh (maks. 4 pemain).",
  room_unavailable: "Room tidak tersedia.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  const { data: profile } = await supabase
    .from("profiles").select("name, avatar_url").eq("id", user.id).single();

  const { data: myRooms } = await supabase
    .from("rooms")
    .select("*, room_players(*, profiles(name, avatar_url))")
    .eq("host_id", user.id)
    .in("status", ["waiting", "playing"])
    .order("created_at", { ascending: false });

  const { data: pendingInvites } = await supabase
    .from("invites")
    .select("*, rooms(room_code, status), profiles!invites_from_user_id_fkey(name, avatar_url)")
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";

  return (
    <div className="space-y-6 animate-fade-up">

      {/* Greeting card */}
      <div className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background:"linear-gradient(135deg, #EEF0FF 0%, #FFF0F7 100%)",
          border:"1.5px solid rgba(124,111,247,0.15)",
          boxShadow:"0 4px 20px rgba(124,111,247,0.1)" }}>
        <div style={{ position:"absolute", right:-16, top:-16, fontSize:96, opacity:.1, transform:"rotate(15deg)" }}>🎲</div>
        <div className="flex items-center gap-4">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt={profile.name ?? "Avatar"}
              className="rounded-full"
              style={{ width:52, height:52, border:"3px solid white",
                boxShadow:"0 4px 12px rgba(124,111,247,0.2)" }} />
          )}
          <div>
            <p className="text-sm" style={{ color:"#6B7280" }}>{greeting}!</p>
            <p className="text-xl font-semibold" style={{ color:"var(--t1)" }}>
              {profile?.name} 👋
            </p>
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{ background:"var(--pp-l)", color:"var(--pp)" }}>
            🎮 Siap main hari ini?
          </span>
        </div>
      </div>

      {/* Error */}
      {error && ERR[error] && (
        <div className="rounded-2xl px-4 py-3 text-sm animate-bounce-in"
          style={{ background:"#FFF0F0", border:"1.5px solid #FECACA", color:"#DC2626" }}>
          😅 {ERR[error]}
        </div>
      )}

      {/* Undangan */}
      <InviteListener userId={user.id} initialInvites={(pendingInvites ?? []) as any} />

      {/* Buat & join */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border p-6 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg group"
          style={{ background:"var(--card)", borderColor:"var(--border)",
            boxShadow:"0 2px 12px rgba(124,111,247,0.08)" }}>
          <div className="text-4xl mb-3">🏠</div>
          <h3 className="font-semibold text-base mb-1" style={{ color:"var(--t1)" }}>Buat Room Baru</h3>
          <p className="text-sm mb-4" style={{ color:"var(--t2)" }}>Jadi host dan undang teman-temanmu.</p>
          <form action={createRoom}>
            <button type="submit"
              className="w-full py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background:"var(--pp)", color:"#fff",
                boxShadow:"0 4px 14px rgba(124,111,247,0.35)" }}>
              🎲 Buat Room
            </button>
          </form>
        </div>

        <div className="rounded-3xl border p-6"
          style={{ background:"var(--card)", borderColor:"var(--border)",
            boxShadow:"0 2px 12px rgba(124,111,247,0.08)" }}>
          <div className="text-4xl mb-3">🔑</div>
          <h3 className="font-semibold text-base mb-1" style={{ color:"var(--t1)" }}>Masuk dengan Kode</h3>
          <p className="text-sm mb-4" style={{ color:"var(--t2)" }}>Punya kode 6 karakter? Langsung masuk!</p>
          <JoinRoomInput />
        </div>
      </div>

      {/* Room aktif */}
      {myRooms && myRooms.length > 0 && (
        <div className="rounded-3xl border p-6"
          style={{ background:"var(--card)", borderColor:"var(--border)" }}>
          <h3 className="font-semibold text-base mb-4 flex items-center gap-2" style={{ color:"var(--t1)" }}>
            <span>⏱️</span> Room Aktifmu
          </h3>
          <div className="space-y-3">
            {myRooms.map((room) => (
              <a key={room.id} href={`/room/${room.room_code}`}
                className="flex items-center justify-between p-4 rounded-2xl transition-all hover:scale-[1.01]"
                style={{ background:"var(--pp-l)", border:"1.5px solid rgba(124,111,247,.2)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold tracking-widest text-lg" style={{ color:"var(--pp)" }}>
                    {room.room_code}
                  </span>
                  <StatusBadge status={room.status} />
                </div>
                <span className="text-sm" style={{ color:"var(--t2)" }}>
                  👥 {room.room_players?.length ?? 0}/4
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    waiting: { bg:"var(--am-l)", color:"#92400E", label:"⏳ Menunggu" },
    playing: { bg:"#F0FDF4", color:"#15803D", label:"🟢 Berlangsung" },
    finished:{ bg:"#F3F4F6", color:"#6B7280", label:"✓ Selesai" },
  };
  const c = cfg[status] ?? cfg.finished;
  return (
    <span className="text-xs px-3 py-1 rounded-full font-medium"
      style={{ background:c.bg, color:c.color }}>
      {c.label}
    </span>
  );
}