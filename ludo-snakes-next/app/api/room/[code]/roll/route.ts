import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rollDice, processTurn, getCurrentPlayer } from "@/lib/game-engine";
import type { GameState } from "@/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { code } = await params;
  const roomCode = code.toUpperCase();

  // 1. Ambil data room dari database
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, state, status")
    .eq("room_code", roomCode)
    .single();

  if (roomError || !room) {
    console.error("[ROLL] Room not found:", roomCode, roomError);
    return NextResponse.json(
      { error: "Room tidak ditemukan" },
      { status: 404 },
    );
  }

  if (room.status !== "playing") {
    return NextResponse.json(
      { error: "Game belum dimulai atau sudah selesai" },
      { status: 400 },
    );
  }

  const currentState = room.state as GameState;
  if (!currentState) {
    return NextResponse.json(
      { error: "State game tidak valid" },
      { status: 400 },
    );
  }

  // 2. Validasi giliran
  const currentPlayer = getCurrentPlayer(currentState);
  console.log("[ROLL] current_turn_order:", currentState.current_turn_order);
  console.log("[ROLL] currentPlayer:", currentPlayer?.user_id, "order:", currentPlayer?.order, "has_rolled:", currentPlayer?.has_rolled);
  console.log("[ROLL] requesting user:", user.id);

  if (!currentPlayer || currentPlayer.user_id !== user.id) {
    return NextResponse.json(
      { error: "Bukan giliranmu" },
      { status: 403 },
    );
  }

  if (currentPlayer.has_rolled) {
    return NextResponse.json(
      { error: "Kamu sudah roll di giliran ini" },
      { status: 400 },
    );
  }

  if (currentPlayer.finished || currentPlayer.left) {
    return NextResponse.json(
      { error: "Pemain sudah selesai atau keluar" },
      { status: 400 },
    );
  }

  // 3. Roll dadu di server (tidak bisa dipalsukan)
  const roll = rollDice();

  // 4. Proses giliran dengan logika TypeScript (game-engine.ts)
  const { newState, events } = processTurn(currentState, user.id, roll);

  console.log("[ROLL] BEFORE turn_order:", currentState.current_turn_order);
  console.log("[ROLL] AFTER  turn_order:", newState.current_turn_order);
  console.log("[ROLL] Players has_rolled:", newState.players.map(p => ({ order: p.order, has_rolled: p.has_rolled, user_id: p.user_id.slice(0,8) })));

  // 5. Tentukan apakah game sudah selesai
  const newStatus = newState.winner ? "finished" : "playing";

  // 6. Simpan state baru ke database
  const { data: updateData, error: updateError } = await supabase
    .from("rooms")
    .update({
      state: newState as any,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id)
    .select("id")
    .single();

  if (updateError) {
    console.error("[ROLL] Update error:", updateError);
    return NextResponse.json(
      { error: "Gagal menyimpan state game" },
      { status: 500 },
    );
  }

  if (!updateData) {
    console.error("[ROLL] Update returned no data — RLS mungkin memblokir UPDATE!");
    return NextResponse.json(
      { error: "Gagal menyimpan state (RLS)" },
      { status: 403 },
    );
  }

  console.log("[ROLL] State saved successfully. New turn_order:", newState.current_turn_order);

  // 7. Broadcast ke semua pemain via Supabase Realtime
  try {
    await supabase.channel(`game:${room.id}`).send({
      type: "broadcast",
      event: "roll_update",
      payload: { state: newState, events, roll },
    });
    console.log("[ROLL] Broadcast sent to channel game:" + room.id);
  } catch (e) {
    console.error("[ROLL] Broadcast failed:", e);
  }

  return NextResponse.json({ success: true, roll, events, state: newState });
}
