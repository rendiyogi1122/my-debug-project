import { createClient } from "@/lib/supabase/server";
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

  const { data: room } = await supabase
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
    state.current_turn_order = advanceTurn(state);
  }

  // Cek apakah sisa pemain aktif hanya 1 → game over
  const activePlayers = state.players.filter((p) => !p.left && !p.finished);
  const isGameOver    = activePlayers.length <= 1;

  if (isGameOver && activePlayers.length === 1) {
    state.winner = activePlayers[0].user_id;
  }

  await supabase
    .from("rooms")
    .update({
      state,
      ...(isGameOver ? { status: "finished" } : {}),
    })
    .eq("id", room.id);

  return NextResponse.json({ success: true });
}