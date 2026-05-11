import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { rollDice } from "@/lib/game-engine";
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

  // Roll dadu di sisi aplikasi (tidak bisa dipalsukan karena server yang roll)
  const roll = rollDice();

  // Semua logika game + UPDATE state dijalankan dalam satu transaksi di Postgres
  // SECURITY DEFINER memastikan function bypass RLS — tidak perlu policy khusus
  const { data: result, error: rpcError } = await supabase.rpc("process_roll", {
    p_room_code: code.toUpperCase(),
    p_user_id: user.id,
    p_white1: roll.white1,
    p_white2: roll.white2,
    p_red: roll.red,
  });

  if (rpcError) {
    console.error("RPC error:", rpcError);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 },
    );
  }

  if (!result?.ok) {
    const status = result?.error === "Bukan giliranmu" ? 403 : 400;
    return NextResponse.json(
      { error: result?.error ?? "Validasi gagal" },
      { status },
    );
  }

  const newState = result.state as GameState;
  const events = result.events as string[];

  // Broadcast best-effort — postgres_changes jadi fallback utama untuk semua client
  try {
    await supabase.channel(`game:${result.room_id ?? ""}`).send({
      type: "broadcast",
      event: "roll_update",
      payload: { state: newState, events, roll },
    });
  } catch (e) {
    console.error("Broadcast failed:", e);
  }

  return NextResponse.json({ success: true, roll, events, state: newState });
}
