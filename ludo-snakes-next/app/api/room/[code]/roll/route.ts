import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { processTurn, rollDice, getCurrentPlayer } from "@/lib/game-engine";
import type { GameState } from "@/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;

  // Ambil room + state
  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_players(user_id, player_order, color)")
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room || room.status !== "playing") {
    return NextResponse.json({ error: "Game tidak aktif" }, { status: 400 });
  }

  const state = room.state as GameState;
  if (!state) {
    return NextResponse.json({ error: "State tidak ditemukan" }, { status: 400 });
  }

  // Validasi giliran
  const currentPlayer = getCurrentPlayer(state);
  if (!currentPlayer || currentPlayer.user_id !== user.id) {
    return NextResponse.json(
      { error: "Bukan giliranmu" },
      { status: 403 }
    );
  }

  // Roll dadu & proses
  const roll = rollDice();
  const { newState, events } = processTurn(state, user.id, roll);

  // Simpan state baru ke database
  // Perubahan ini akan trigger Supabase Realtime ke semua client
  const { error } = await supabase
    .from("rooms")
    .update({
      state: newState,
      ...(newState.winner ? { status: "finished" } : {}),
    })
    .eq("id", room.id);

  if (error) {
    return NextResponse.json(
      { error: "Gagal menyimpan state" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    roll,
    events,
    state: newState,
  });
}