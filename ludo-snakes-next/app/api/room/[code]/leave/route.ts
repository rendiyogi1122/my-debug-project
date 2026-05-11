import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { advanceTurn } from "@/lib/game-engine";
import type { GameState } from "@/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await params;

  // Admin client untuk operasi write (bypass RLS)
  const admin = createAdminClient();

  const { data: room } = await admin
    .from("rooms")
    .select("*")
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room || room.status !== "playing") {
    return NextResponse.json({ error: "Game tidak aktif" }, { status: 400 });
  }

  const state = room.state as GameState;
  const playerIdx = state.players.findIndex((p) => p.user_id === user.id);
  if (playerIdx === -1) {
    return NextResponse.json({ error: "Pemain tidak ditemukan" }, { status: 404 });
  }

  // Tandai pemain sebagai keluar
  state.players[playerIdx].left = true;

  // Kalau giliran pemain ini, advance ke berikutnya
  if (state.current_turn_order === state.players[playerIdx].order) {
    const nextTurnOrder = advanceTurn(state);
    // Reset has_rolled untuk pemain berikutnya agar tidak stuck
    const nextPlayer = state.players.find((p) => p.order === nextTurnOrder);
    if (nextPlayer) {
      nextPlayer.has_rolled = false;
    }
    state.current_turn_order = nextTurnOrder;
  }

  // Cek apakah sisa pemain aktif hanya 1 → game over
  const activePlayers = state.players.filter((p) => !p.left && !p.finished);
  const isGameOver    = activePlayers.length <= 1;

  if (isGameOver && activePlayers.length === 1) {
    state.winner = activePlayers[0].user_id;
  }

  // Simpan ke DB via admin client (bypass RLS)
  const { error: updateError } = await admin
    .from("rooms")
    .update({
      state,
      ...(isGameOver ? { status: "finished" } : {}),
    })
    .eq("id", room.id);

  if (updateError) {
    console.error("[LEAVE] Update error:", updateError);
    return NextResponse.json({ error: "Gagal menyimpan state" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}