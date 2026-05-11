import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Admin client untuk operasi write (bypass RLS)
  const admin = createAdminClient();

  // 1. Ambil data room dari database (admin bypass RLS)
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, state, status")
    .eq("room_code", roomCode)
    .single();

  if (roomError || !room) {
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

  // 5. Tentukan apakah game sudah selesai
  const newStatus = newState.winner ? "finished" : "playing";

  // 6. Simpan state baru ke database (admin bypass RLS)
  const { error: updateError } = await admin
    .from("rooms")
    .update({
      state: newState as any,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (updateError) {
    console.error("[ROLL] Update error:", updateError);
    return NextResponse.json(
      { error: "Gagal menyimpan state game" },
      { status: 500 },
    );
  }

  // 7. Broadcast ke semua pemain via Supabase Realtime (httpSend untuk server-side)
  try {
    const channel = admin.channel(`game:${room.id}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "roll_update",
      payload: { state: newState, events, roll },
    });
    await admin.removeChannel(channel);
  } catch (e) {
    console.error("[ROLL] Broadcast failed:", e);
  }

  return NextResponse.json({ success: true, roll, events, state: newState });
}
