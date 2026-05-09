import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Definisi ular dan tangga — sama persis dengan versi Laravel kamu
const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};

const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
};

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

  // Ambil data room
  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_players(*, profiles(id, name))")
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room tidak ditemukan" }, { status: 404 });
  }

  // Hanya host yang bisa mulai
  if (room.host_id !== user.id) {
    return NextResponse.json({ error: "Bukan host" }, { status: 403 });
  }

  if (room.status !== "waiting") {
    return NextResponse.json({ error: "Game sudah dimulai" }, { status: 400 });
  }

  if (room.room_players.length < 2) {
    return NextResponse.json(
      { error: "Minimal 2 pemain" },
      { status: 400 }
    );
  }

  // Susun initial game state
  const players = room.room_players
    .sort((a: any, b: any) => a.player_order - b.player_order)
    .map((p: any) => ({
      user_id: p.user_id,
      name: p.profiles?.name ?? "Pemain",
      order: p.player_order,
      color: p.color,
      position: 0,
      in_base: true,
      finished: false,
      left: false,
    }));

  const initialState = {
    players,
    current_turn_order: 1,
    winner: null,
    snakes: SNAKES,
    ladders: LADDERS,
    last_roll: null,
  };

  // Update room: status → playing, simpan game state
  const { error } = await supabase
    .from("rooms")
    .update({
      status: "playing",
      state: initialState,
    })
    .eq("id", room.id);

  if (error) {
    return NextResponse.json(
      { error: "Gagal memulai game" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}