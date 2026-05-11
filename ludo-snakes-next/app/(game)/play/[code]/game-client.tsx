"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";
import { Board, type AnimatingPlayer } from "@/components/game/board";
import { getCurrentPlayer } from "@/lib/game-engine";
import { SNAKES, LADDERS } from "@/lib/game-engine";
import type { GameState } from "@/types/database";

interface RoomPlayer {
  user_id: string;
  player_order: number;
  color: string;
  profiles: { name: string } | null;
}

interface GameClientProps {
  roomId: string;
  roomCode: string;
  initialState: GameState;
  currentUserId: string;
  roomPlayers: RoomPlayer[];
}

const COLOR_CFG: Record<
  string,
  { bg: string; border: string; text: string; dot: string; label: string }
> = {
  red:    { bg: "#FFF0F7", border: "rgba(244,114,182,.3)", text: "#BE185D", dot: "#e63946", label: "Merah" },
  blue:   { bg: "#EFF6FF", border: "rgba(59,130,246,.3)",  text: "#1D4ED8", dot: "#2196F3", label: "Biru" },
  green:  { bg: "#F0FDF4", border: "rgba(34,197,94,.3)",   text: "#15803D", dot: "#4caf50", label: "Hijau" },
  yellow: { bg: "#FFFBEB", border: "rgba(251,191,36,.3)",  text: "#92400E", dot: "#ff9800", label: "Kuning" },
};

const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

export function GameClient({
  roomId,
  roomCode,
  initialState,
  currentUserId,
  roomPlayers,
}: GameClientProps) {
  const router = useRouter();
  const [state, setState] = useState<GameState>(initialState);
  const [rolling, setRolling] = useState(false);
  const [diceAnim, setDiceAnim] = useState(false);
  const [displayDice, setDisplayDice] = useState({ w1: 1, w2: 1, r: 1 });
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Animasi pion — diset setelah server broadcast roll baru
  const [animPlayer, setAnimPlayer] = useState<AnimatingPlayer | null>(null);
  // Simpan state pending sementara animasi belum selesai
  const pendingStateRef = useRef<GameState | null>(null);

  // Rekam posisi sebelum update agar tahu dari mana animasi harus mulai
  const prevPositionsRef = useRef<Record<string, number>>({});

  useRealtime({
    channel: `game:${roomId}`,
    table: "rooms",
    filter: `id=eq.${roomId}`,
    broadcastEvents: ["roll_update"],
    onPostgresChange: useCallback(
      (payload: any) => {
        if (payload.new?.state) setState(payload.new.state as GameState);
        if (payload.new?.status === "finished")
          setTimeout(() => router.push(`/play/${roomCode}/result`), 1500);
      },
      [router, roomCode],
    ),
    onBroadcast: useCallback(
      (event: string, payload: any) => {
        if (event === "roll_update" && payload?.state) {
          const newState = payload.state as GameState;

          if (payload.events) {
            setEvents((prev) => [...payload.events, ...prev].slice(0, 10));
          }

          // Deteksi siapa yang bergerak & tentukan jenis animasi
          const prevPositions = prevPositionsRef.current;
          let detectedAnim: AnimatingPlayer | null = null;

          for (const p of newState.players) {
            const prevPos = prevPositions[p.user_id];
            if (prevPos === undefined) continue;
            const newPos = p.position;
            if (newPos === prevPos) continue;
            if (p.in_base) continue; // masuk base = tidak ada animasi jalan

            // Tentukan posisi intermediate (before snake/ladder applied)
            const lastRoll = newState.last_roll;
            if (!lastRoll || lastRoll.by !== p.user_id) continue;

            const net = lastRoll.white1 + lastRoll.white2 - lastRoll.red;
            const rawPos = Math.min(50, Math.max(1, prevPos + net));

            if (SNAKES[rawPos] !== undefined && newPos === SNAKES[rawPos]) {
              // Kena ular: animasi walk ke kepala, lalu slide turun
              detectedAnim = {
                userId: p.user_id,
                fromPos: prevPos,
                toPos: rawPos,   // kepala ular
                type: "snake",
                onDone: () => {
                  setAnimPlayer(null);
                  const ps = pendingStateRef.current;
                  if (ps) { setState(ps); pendingStateRef.current = null; }
                },
              };
            } else if (LADDERS[rawPos] !== undefined && newPos === LADDERS[rawPos]) {
              // Naik tangga
              detectedAnim = {
                userId: p.user_id,
                fromPos: prevPos,
                toPos: rawPos,   // bawah tangga
                type: "ladder",
                onDone: () => {
                  setAnimPlayer(null);
                  const ps = pendingStateRef.current;
                  if (ps) { setState(ps); pendingStateRef.current = null; }
                },
              };
            } else {
              // Jalan biasa (termasuk kotak 25 / finish)
              detectedAnim = {
                userId: p.user_id,
                fromPos: prevPos,
                toPos: newPos,
                type: "walk",
                onDone: () => {
                  setAnimPlayer(null);
                  const ps = pendingStateRef.current;
                  if (ps) { setState(ps); pendingStateRef.current = null; }
                },
              };
            }
            break;
          }

          // Update prevPositions untuk ronde berikutnya
          newState.players.forEach((p) => {
            if (!p.in_base && p.position > 0) {
              prevPositionsRef.current[p.user_id] = p.position;
            }
          });

          if (detectedAnim) {
            pendingStateRef.current = newState;
            // State sementara: posisi belum berubah untuk visual (animasi yang gerakkan pion)
            setAnimPlayer(detectedAnim);
          } else {
            setState(newState);
          }
        }
      },
      [],
    ),
  });

  const currentPlayer = getCurrentPlayer(state);
  const isMyTurn = currentPlayer?.user_id === currentUserId;

  const enriched = state.players.map((p) => {
    const rp = roomPlayers.find((r) => r.user_id === p.user_id);
    return { ...p, name: rp?.profiles?.name ?? p.color };
  });

  const handleRoll = useCallback(async () => {
    if (!isMyTurn || rolling || animPlayer) return;

    // Rekam posisi sebelum roll
    state.players.forEach((p) => {
      if (!p.in_base && p.position > 0) {
        prevPositionsRef.current[p.user_id] = p.position;
      }
    });

    setRolling(true);
    setDiceAnim(true);
    setError(null);

    let tick2 = 0;
    const iv = setInterval(() => {
      setDisplayDice({ w1: Math.ceil(Math.random() * 6), w2: Math.ceil(Math.random() * 6), r: Math.ceil(Math.random() * 6) });
      if (++tick2 > 8) clearInterval(iv);
    }, 70);

    await new Promise((r) => setTimeout(r, 650));

    try {
      const res = await fetch(`/api/room/${roomCode}/roll`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan");
        return;
      }
      setDisplayDice({ w1: data.roll.white1, w2: data.roll.white2, r: data.roll.red });
      setEvents((prev) => [...data.events, ...prev].slice(0, 10));
    } catch {
      setError("Gagal terhubung ke server");
    } finally {
      setRolling(false);
      setDiceAnim(false);
    }
  }, [isMyTurn, rolling, roomCode, state.players, animPlayer]);

  async function handleLeave() {
    if (!confirm("Yakin ingin keluar? Giliranmu akan di-skip otomatis.")) return;
    await fetch(`/api/room/${roomCode}/leave`, { method: "POST" });
    router.push("/dashboard");
  }

  const lastRoll = state.last_roll;
  const net = lastRoll ? lastRoll.white1 + lastRoll.white2 - lastRoll.red : 0;
  const curPlayer = getCurrentPlayer(state);
  const curName =
    roomPlayers.find((r) => r.user_id === curPlayer?.user_id)?.profiles?.name ??
    curPlayer?.color ??
    "—";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Navbar */}
      <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderBottom: "1.5px solid var(--border)", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-float inline-block">🎲</span>
            <span className="font-semibold" style={{ color: "var(--t1)" }}>Ludo Snakes</span>
            <span className="font-mono text-sm ml-1" style={{ color: "var(--pp)" }}>#{roomCode}</span>
          </div>
          <button
            onClick={handleLeave}
            className="text-xs px-3 py-1.5 rounded-xl transition-all hover:scale-105"
            style={{ background: "var(--pk-l)", color: "#BE185D", border: "1.5px solid rgba(244,114,182,.2)" }}
          >
            🚪 Keluar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel kiri */}
        <div className="space-y-4">
          {/* Giliran */}
          <div className="rounded-3xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)", boxShadow: "0 4px 16px rgba(124,111,247,0.1)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--t3)" }}>Giliran sekarang</p>
            <p className="text-lg font-semibold" style={{ color: "var(--t1)" }}>{curName}</p>
            {isMyTurn && !state.winner && (
              <p className="text-xs mt-1 animate-pulse-dot" style={{ color: "var(--pp)" }}>✨ Giliranmu! Klik roll.</p>
            )}
          </div>

          {/* Pemain */}
          <div className="rounded-3xl border p-5 space-y-2.5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-xs font-medium mb-3" style={{ color: "var(--t3)" }}>Pemain</p>
            {enriched.map((p) => {
              const cfg = COLOR_CFG[p.color] ?? COLOR_CFG.red;
              const isTurn = p.order === state.current_turn_order;
              return (
                <div
                  key={p.user_id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all"
                  style={{ background: isTurn ? cfg.bg : "transparent", border: `1.5px solid ${isTurn ? cfg.border : "transparent"}` }}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--t1)" }}>
                      {p.name}{p.user_id === currentUserId && <span style={{ color: "var(--t3)" }}> (kamu)</span>}
                    </p>
                    <p className="text-xs" style={{ color: cfg.text }}>
                      {p.finished ? "🏆 Finish" : p.left ? "🚪 Keluar" : p.in_base ? "Base" : `Kotak ${p.position}`}
                    </p>
                  </div>
                  {isTurn && !p.finished && !p.left && (
                    <span className="text-xs animate-pulse-dot" style={{ color: cfg.text }}>●</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dadu */}
          <div className="rounded-3xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <p className="text-xs mb-3" style={{ color: "var(--t3)" }}>Dadu terakhir</p>
            <div className="flex items-center justify-center gap-3 mb-3">
              {[
                { val: displayDice.w1 || lastRoll?.white1 || 1, bg: "#fff", border: "#E5E7EB" },
                { val: displayDice.w2 || lastRoll?.white2 || 1, bg: "#fff", border: "#E5E7EB" },
              ].map(({ val, bg, border }, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 ${diceAnim ? "animate-roll" : ""}`}
                  style={{ background: bg, borderColor: border, boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}
                >
                  {FACES[(val || 1) - 1]}
                </div>
              ))}
              <span style={{ color: "var(--t3)", fontSize: 18 }}>−</span>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border-2 ${diceAnim ? "animate-roll" : ""}`}
                style={{ background: "#FFF0F0", borderColor: "#FECACA" }}
              >
                {FACES[(displayDice.r || lastRoll?.red || 1) - 1]}
              </div>
            </div>
            {lastRoll && (
              <p className="text-xs text-center" style={{ color: "var(--t3)" }}>
                {lastRoll.white1}+{lastRoll.white2}−{lastRoll.red} ={" "}
                <span className="font-medium" style={{ color: net >= 0 ? "var(--pp)" : "#EF4444" }}>
                  {net >= 0 ? "+" : ""}{net}
                </span>
              </p>
            )}
          </div>

          {/* Tombol roll */}
          {!state.winner && (
            <button
              onClick={handleRoll}
              disabled={!isMyTurn || rolling || !!currentPlayer?.has_rolled || !!animPlayer}
              className="w-full py-4 rounded-2xl text-base font-semibold transition-all"
              style={{
                background: isMyTurn && !currentPlayer?.has_rolled && !animPlayer ? "var(--pp)" : "#F3F4F6",
                color: isMyTurn && !currentPlayer?.has_rolled && !animPlayer ? "#fff" : "var(--t3)",
                boxShadow: isMyTurn && !currentPlayer?.has_rolled && !animPlayer ? "0 6px 20px rgba(124,111,247,0.35)" : "none",
                cursor: isMyTurn && !currentPlayer?.has_rolled && !animPlayer ? "pointer" : "not-allowed",
              }}
            >
              {rolling ? "🎲 Rolling..." :
               animPlayer ? "⏳ Animasi berjalan..." :
               !isMyTurn ? "⏳ Giliran orang lain..." :
               currentPlayer?.has_rolled ? "✅ Sudah spin, tunggu giliran berikutnya" :
               "🎲 Roll Dadu!"}
            </button>
          )}

          {error && <p className="text-sm text-center" style={{ color: "#EF4444" }}>{error}</p>}

          {/* Log */}
          {events.length > 0 && (
            <div className="rounded-2xl border p-4 max-h-32 overflow-y-auto" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <p className="text-xs mb-2 font-medium uppercase tracking-wider" style={{ color: "var(--t3)" }}>Log</p>
              <div className="space-y-1">
                {events.map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: i === 0 ? "var(--t1)" : "var(--t3)" }}>{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Papan */}
        <div className="lg:col-span-2 space-y-4">
          {state.winner && (
            <div
              className="rounded-3xl p-5 text-center animate-bounce-in"
              style={{ background: "linear-gradient(135deg,#FFFBEB,#FFF7ED)", border: "2px solid rgba(251,191,36,.4)", boxShadow: "0 4px 20px rgba(251,191,36,.2)" }}
            >
              <p className="text-2xl font-bold mb-1" style={{ color: "#92400E" }}>🏆 Game Selesai!</p>
              <p style={{ color: "#B45309", fontSize: 14 }}>
                {state.winner === currentUserId
                  ? "Kamu menang! 🎉"
                  : `${roomPlayers.find((r) => r.user_id === state.winner)?.profiles?.name ?? "Seseorang"} menang!`}
              </p>
            </div>
          )}

          <Board players={enriched} animatingPlayer={animPlayer} />
        </div>
      </div>
    </div>
  );
}
