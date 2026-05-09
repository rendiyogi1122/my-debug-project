import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GameClient } from "./game-client";
import type { GameState } from "@/types/database";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { code } = await params;

  const { data: room } = await supabase
    .from("rooms")
    .select("*, room_players(user_id, player_order, color, profiles(name))")
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room) redirect("/dashboard");
  if (room.status === "waiting") redirect(`/room/${code}`);
  if (room.status === "finished") redirect(`/play/${code}/result`);

  const isPlayer = room.room_players.some(
    (p: any) => p.user_id === user.id
  );
  if (!isPlayer) redirect("/dashboard");

  return (
    <GameClient
      roomId={room.id}
      roomCode={code.toUpperCase()}
      initialState={room.state as GameState}
      currentUserId={user.id}
      roomPlayers={room.room_players}
    />
  );
}