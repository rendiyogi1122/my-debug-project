"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import Image from "next/image";
import { InvitePlayerModal } from "@/components/game/invite-player-modal";

interface Player {
  id: string;
  user_id: string;
  player_order: number;
  color: string;
  profiles: { id: string; name: string; avatar_url: string | null };
}

interface LobbyClientProps {
  roomCode: string;
  roomId: string;
  isHost: boolean;
  canStart: boolean;
  currentUserId: string;
  initialPlayers: Player[];
  hostId: string;
}

const COLOR_CFG: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
  red:    { bg:"#FFF0F7", border:"rgba(244,114,182,.3)", text:"#BE185D", label:"Merah",  dot:"#EF4444" },
  blue:   { bg:"#EFF6FF", border:"rgba(59,130,246,.3)",  text:"#1D4ED8", label:"Biru",   dot:"#3B82F6" },
  green:  { bg:"#F0FDF4", border:"rgba(34,197,94,.3)",   text:"#15803D", label:"Hijau",  dot:"#22C55E" },
  yellow: { bg:"#FFFBEB", border:"rgba(251,191,36,.3)",  text:"#92400E", label:"Kuning", dot:"#F59E0B" },
};

export function LobbyClient({ roomCode, roomId, isHost, currentUserId, initialPlayers, hostId }: LobbyClientProps) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [isStarting, setIsStarting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canStart = players.length >= 2 && isHost;

  useRealtime({
    channel: `lobby:${roomId}`,
    table: "room_players",
    filter: `room_id=eq.${roomId}`,
    onPostgresChange: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("room_players")
        .select("*, profiles(id, name, avatar_url)")
        .eq("room_id", roomId)
        .order("player_order");
      if (data) setPlayers(data as Player[]);
    },
    broadcastEvents: ["game_started", "room_closed"],
    onBroadcast: (event) => {
      if (event === "game_started") router.push(`/play/${roomCode}`);
      if (event === "room_closed") router.push("/dashboard");
    },
  });

  useRealtime({
    channel: `room-status:${roomId}`,
    table: "rooms",
    filter: `id=eq.${roomId}`,
    onPostgresChange: (payload) => {
      if (payload.new?.status === "playing") router.push(`/play/${roomCode}`);
      if (payload.new?.status === "finished") router.push("/dashboard");
    },
  });

  const handleStartGame = useCallback(async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    try {
      const res = await fetch(`/api/room/${roomCode}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Gagal memulai game");
        setIsStarting(false);
      }
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
      setIsStarting(false);
    }
  }, [canStart, isStarting, roomCode]);

  return (
    <div className="space-y-4">
      {/* Daftar pemain */}
      <div className="rounded-3xl border p-6"
        style={{ background:"var(--card)", borderColor:"var(--border)",
          boxShadow:"0 4px 20px rgba(124,111,247,0.08)" }}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-semibold text-base" style={{ color:"var(--t1)" }}>
            Pemain di Lobby
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{ background:"var(--tl-l)", color:"#0F766E" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse-dot inline-block" />
            Live
          </div>
          <span className="ml-auto text-sm font-medium" style={{ color:"var(--pp)" }}>
            {players.length}/4
          </span>
        </div>

        <div className="space-y-3">
          {players.map((player, idx) => {
            const cfg = COLOR_CFG[player.color] ?? COLOR_CFG.red;
            return (
              <div key={player.id} className="flex items-center gap-3 p-3.5 rounded-2xl animate-slide-in"
                style={{ background:cfg.bg, border:`1.5px solid ${cfg.border}`,
                  animationDelay:`${idx * 0.05}s` }}>
                {player.profiles?.avatar_url ? (
                  <Image src={player.profiles.avatar_url} alt={player.profiles.name}
                    width={42} height={42} className="rounded-full"
                    style={{ border:`2px solid white`, boxShadow:`0 2px 8px ${cfg.border}` }} />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ background:cfg.bg, border:`2px solid ${cfg.dot}` }}>
                    😊
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color:"var(--t1)" }}>
                    {player.profiles?.name}
                    {player.user_id === currentUserId && (
                      <span className="ml-1.5 text-xs" style={{ color:"var(--t3)" }}>(kamu)</span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color:cfg.text }}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1"
                      style={{ background:cfg.dot }} />
                    {cfg.label} • Urutan {player.player_order}
                  </p>
                </div>
                {player.user_id === hostId && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background:"var(--pp-l)", color:"var(--pp)" }}>
                    👑 Host
                  </span>
                )}
              </div>
            );
          })}

          {/* Slot kosong */}
          {Array.from({ length: 4 - players.length }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl"
              style={{ border:"2px dashed var(--border)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ background:"#F3F4F6" }}>
                ➕
              </div>
              <p className="text-sm" style={{ color:"var(--t3)" }}>Menunggu pemain ke-{players.length + i + 1}...</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tombol aksi */}
      <div className="rounded-3xl border p-5"
        style={{ background:"var(--card)", borderColor:"var(--border)" }}>
        {isHost ? (
          <>
            <p className="text-sm mb-3 text-center" style={{ color:"var(--t2)" }}>
              {canStart ? "✅ Semua siap! Mulai gamenya sekarang." : "⏳ Butuh minimal 2 pemain untuk mulai."}
            </p>

            {/* Tombol Undang Pemain — hanya muncul kalau slot masih ada */}
            {players.length < 4 && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="w-full py-3 rounded-2xl text-sm font-semibold mb-3 transition-all"
                style={{
                  background: "var(--bg)",
                  color: "var(--pp)",
                  border: "1.5px solid var(--pp)",
                  cursor: "pointer",
                }}
              >
                👥 Undang Pemain
              </button>
            )}

            <button onClick={handleStartGame} disabled={!canStart || isStarting}
              className="w-full py-4 rounded-2xl text-base font-semibold transition-all"
              style={{
                background: canStart ? "var(--pp)" : "#E5E7EB",
                color: canStart ? "#fff" : "var(--t3)",
                boxShadow: canStart ? "0 6px 20px rgba(124,111,247,0.35)" : "none",
                transform: canStart ? undefined : "none",
                cursor: canStart ? "pointer" : "not-allowed",
              }}>
              {isStarting ? "⏳ Memulai..." : "🎮 Mulai Game!"}
            </button>
          </>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full animate-pulse-dot"
              style={{ background:"var(--am)", display:"inline-block" }} />
            <span className="text-sm" style={{ color:"var(--t2)" }}>
              Menunggu host memulai game...
            </span>
          </div>
        )}
      </div>

      {/* Modal undang pemain */}
      {showInviteModal && (
        <InvitePlayerModal
          roomCode={roomCode}
          roomId={roomId}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}