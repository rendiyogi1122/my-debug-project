"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  channel: string;
  onPostgresChange?: (payload: any) => void;
  onBroadcast?: (event: string, payload: any) => void;
  broadcastEvents?: string[];
  table?: string;
  filter?: string;
}

export function useRealtime({
  channel,
  onPostgresChange,
  onBroadcast,
  broadcastEvents = [],
  table,
  filter,
}: UseRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(channel);

    // Mode 1: listen perubahan database
    if (onPostgresChange && table) {
      ch.on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        onPostgresChange
      );
    }

    // Mode 2: listen broadcast events
    broadcastEvents.forEach((event) => {
      ch.on("broadcast", { event }, (payload) => {
        onBroadcast?.(event, payload);
      });
    });

    ch.subscribe();
    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channel]);

  // Fungsi untuk kirim broadcast
  function sendBroadcast(event: string, payload: any) {
    channelRef.current?.send({
      type: "broadcast",
      event,
      payload,
    });
  }

  return { sendBroadcast };
}