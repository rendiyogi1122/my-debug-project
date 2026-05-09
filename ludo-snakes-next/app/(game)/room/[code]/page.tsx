import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { leaveRoom } from "@/lib/actions/room";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LobbyClient } from "./lobby-client";

export default async function RoomPage({
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
    .select(`
      *,
      room_players(
        *,
        profiles(id, name, avatar_url)
      )
    `)
    .eq("room_code", code.toUpperCase())
    .single();

  if (!room) redirect("/dashboard");

  if (room.status === "playing") redirect(`/play/${code}`);
  if (room.status === "finished") redirect("/dashboard");

  const isInRoom = room.room_players.some(
    (p: any) => p.user_id === user.id
  );
  if (!isInRoom) redirect("/dashboard");

  const isHost = room.host_id === user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header room */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-400 mb-1">Kode Room</p>
            <h1 className="text-4xl font-bold font-mono tracking-widest text-indigo-300">
              {room.room_code}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Bagikan kode ini ke temanmu
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Status</p>
            <p className="text-lg font-semibold text-yellow-400 capitalize">
              Menunggu
            </p>
          </div>
        </div>
      </Card>

      {/* Lobby realtime — daftar pemain + tombol mulai */}
      <LobbyClient
        roomCode={code.toUpperCase()}
        roomId={room.id}
        isHost={isHost}
        canStart={isHost && room.room_players.length >= 2}
        currentUserId={user.id}
        initialPlayers={room.room_players}
        hostId={room.host_id}
      />

      {/* Tombol keluar */}
      <form action={leaveRoom.bind(null, code.toUpperCase())}>
        <Button type="submit" variant="danger" className="w-full">
          {isHost ? "Tutup Room" : "Keluar dari Room"}
        </Button>
      </form>
    </div>
  );
}