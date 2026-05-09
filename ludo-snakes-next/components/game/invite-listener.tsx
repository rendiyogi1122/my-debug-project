"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/hooks/use-realtime";
import { InviteCard } from "./invite-card";

interface Invite {
  id: string;
  room_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  rooms: { room_code: string; status: string };
  profiles: { name: string; avatar_url: string | null };
}

interface InviteListenerProps {
  userId: string;
  initialInvites: Invite[];
}

export function InviteListener({ userId, initialInvites }: InviteListenerProps) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>(initialInvites);

  useRealtime({
    channel: `invites:${userId}`,
    table: "invites",
    filter: `to_user_id=eq.${userId}`,
    onPostgresChange: async (payload) => {
      // Ada invite baru atau status berubah — fetch ulang
      const supabase = createClient();
      const { data } = await supabase
        .from("invites")
        .select(`
          *,
          rooms(room_code, status),
          profiles!invites_from_user_id_fkey(name, avatar_url)
        `)
        .eq("to_user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (data) setInvites(data as Invite[]);

      // Kalau ada invite baru, refresh halaman supaya data server ikut update
      if (payload.eventType === "INSERT") {
        router.refresh();
      }
    },
  });

  if (invites.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-yellow-400">📨</span>
        Undangan masuk ({invites.length})
      </h2>
      <div className="space-y-3">
        {invites.map((invite) => (
          <InviteCard key={invite.id} invite={invite} />
        ))}
      </div>
    </div>
  );
}