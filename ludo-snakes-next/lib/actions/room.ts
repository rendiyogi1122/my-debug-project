"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// Generate kode room unik 6 karakter
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

// ── Buat room baru ──────────────────────────────────────────
export async function createRoom() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cek apakah user sudah punya room aktif
  const { data: existingRoom } = await supabase
    .from("rooms")
    .select("id, room_code")
    .eq("host_id", user.id)
    .in("status", ["waiting", "playing"])
    .single();

  if (existingRoom) {
    redirect(`/room/${existingRoom.room_code}`);
  }

  // Generate kode unik (coba sampai tidak bentrok)
  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_code", roomCode)
      .single();
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

  // Buat room
  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      room_code: roomCode,
      host_id: user.id,
      status: "waiting",
    })
    .select()
    .single();

  if (error || !room) {
    throw new Error("Gagal membuat room");
  }

  // Host otomatis jadi player pertama
  await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    player_order: 1,
    color: "red",
  });

  redirect(`/room/${roomCode}`);
}

// ── Join room via kode ───────────────────────────────────────
export async function joinRoom(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roomCode = (formData.get("room_code") as string)
    ?.trim()
    .toUpperCase();

  if (!roomCode || roomCode.length !== 6) {
    redirect("/dashboard?error=invalid_code");
  }

  // Cari room
  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_players(*)")
    .eq("room_code", roomCode)
    .eq("status", "waiting")
    .single();

  if (!room) {
    redirect("/dashboard?error=room_not_found");
  }

  // Cek apakah sudah ada di room
  const alreadyIn = room.room_players.some(
    (p: { user_id: string }) => p.user_id === user.id
  );
  if (alreadyIn) {
    redirect(`/room/${roomCode}`);
  }

  // Cek kapasitas (max 4 pemain)
  if (room.room_players.length >= 4) {
    redirect("/dashboard?error=room_full");
  }

  // Assign warna berdasarkan urutan
  const colors = ["red", "blue", "green", "yellow"] as const;
  const usedColors = room.room_players.map(
    (p: { color: string }) => p.color
  );
  const availableColor = colors.find((c) => !usedColors.includes(c))!;

  await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    player_order: room.room_players.length + 1,
    color: availableColor,
  });

  redirect(`/room/${roomCode}`);
}

// ── Kirim undangan ───────────────────────────────────────────
export async function sendInvite(toUserId: string, roomCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("room_code", roomCode)
    .single();

  if (!room) throw new Error("Room tidak ditemukan");

  // Cek apakah invite sudah dikirim
  const { data: existing } = await supabase
    .from("invites")
    .select("id")
    .eq("room_id", room.id)
    .eq("to_user_id", toUserId)
    .eq("status", "pending")
    .single();

  if (existing) return { success: false, message: "Undangan sudah dikirim" };

  await supabase.from("invites").insert({
    room_id: room.id,
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  revalidatePath(`/room/${roomCode}`);
  return { success: true };
}

// ── Respons undangan ─────────────────────────────────────────
export async function respondInvite(
  inviteId: string,
  accept: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invite } = await supabase
    .from("invites")
    .select("*, rooms(room_code, status, room_players(*))")
    .eq("id", inviteId)
    .eq("to_user_id", user.id)
    .single();

  if (!invite) throw new Error("Undangan tidak ditemukan");

  if (!accept) {
    await supabase
      .from("invites")
      .update({ status: "declined" })
      .eq("id", inviteId);
    revalidatePath("/dashboard");
    return;
  }

  // Terima — join room
  const room = invite.rooms;
  if (room.status !== "waiting" || room.room_players.length >= 4) {
    redirect("/dashboard?error=room_unavailable");
  }

  const colors = ["red", "blue", "green", "yellow"] as const;
  const usedColors = room.room_players.map(
    (p: { color: string }) => p.color
  );
  const availableColor = colors.find((c) => !usedColors.includes(c))!;

  await supabase.from("room_players").insert({
    room_id: invite.room_id,
    user_id: user.id,
    player_order: room.room_players.length + 1,
    color: availableColor,
  });

  await supabase
    .from("invites")
    .update({ status: "accepted" })
    .eq("id", inviteId);

  redirect(`/room/${room.room_code}`);
}

// ── Keluar dari room ─────────────────────────────────────────
export async function leaveRoom(roomCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: room } = await supabase
    .from("rooms")
    .select("id, host_id")
    .eq("room_code", roomCode)
    .single();

  if (!room) redirect("/dashboard");

  if (room.host_id === user.id) {
    // Host keluar → tutup room
    await supabase
      .from("rooms")
      .update({ status: "finished" })
      .eq("id", room.id);
  } else {
    // Non-host keluar → hapus dari room_players saja
    await supabase
      .from("room_players")
      .delete()
      .eq("room_id", room.id)
      .eq("user_id", user.id);
  }

  redirect("/dashboard");
}