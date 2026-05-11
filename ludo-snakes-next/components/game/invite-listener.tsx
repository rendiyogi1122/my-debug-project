"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

export function InviteListener({
  userId,
  initialInvites,
}: InviteListenerProps) {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>(initialInvites);

  // Fetch ulang invites dari Supabase
  const refetchInvites = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("invites")
      .select(
        `
        *,
        rooms(room_code, status),
        profiles!invites_from_user_id_fkey(name, avatar_url)
      `,
      )
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (data) setInvites(data as Invite[]);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();

    // ── Channel 1: postgres_changes (backup, jika Replica Identity aktif) ──
    const pgChannel = supabase
      .channel(`invites-pg:${userId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "invites",
          filter: `to_user_id=eq.${userId}`,
        },
        async () => {
          await refetchInvites();
        },
      )
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "invites",
          filter: `to_user_id=eq.${userId}`,
        },
        async () => {
          await refetchInvites();
        },
      )
      .subscribe();

    // ── Channel 2: broadcast (utama, real-time instan dari pengirim) ──
    const broadcastChannel = supabase
      .channel(`invites:${userId}`)
      .on("broadcast", { event: "new_invite" }, async () => {
        // Ada invite baru → fetch ulang dari DB
        await refetchInvites();
        // Refresh server component supaya data SSR juga sinkron
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pgChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [userId, refetchInvites, router]);

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
