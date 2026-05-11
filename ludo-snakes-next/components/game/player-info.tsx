"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/types/database";

interface PlayerInfoProps {
  players: PlayerState[];
  currentTurnOrder: number;
  currentUserId: string;
}

const COLOR_CONFIG: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    label: string;
    pion: string;
  }
> = {
  red: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    label: "Merah",
    pion: "bg-red-500",
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
    label: "Biru",
    pion: "bg-blue-500",
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-400",
    label: "Hijau",
    pion: "bg-green-500",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-400",
    label: "Kuning",
    pion: "bg-yellow-400",
  },
};

export function PlayerInfo({
  players,
  currentTurnOrder,
  currentUserId,
}: PlayerInfoProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {players.map((player) => {
        const cfg = COLOR_CONFIG[player.color];
        const isMyTurn = player.order === currentTurnOrder;
        const isMe = player.user_id === currentUserId;

        return (
          <div
            key={player.user_id}
            className={cn(
              "rounded-xl border p-3 transition-all",
              cfg.bg,
              cfg.border,
              isMyTurn && "ring-2 ring-offset-1 ring-offset-slate-900",
              isMyTurn && `ring-${player.color}-400`,
              player.finished && "opacity-50",
              player.left && "opacity-30",
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-3 h-3 rounded-full", cfg.pion)} />
              <span className={cn("text-xs font-semibold", cfg.text)}>
                {cfg.label}
                {isMe && <span className="ml-1 text-slate-400">(kamu)</span>}
              </span>
              {isMyTurn && !player.finished && !player.left && (
                <span className="ml-auto text-[10px] bg-white/10 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                  giliran
                </span>
              )}
            </div>
            <p className="text-sm text-white font-mono">
              {player.finished
                ? "🏆 Finish"
                : player.left
                  ? "🚪 Keluar"
                  : player.in_base
                    ? "Base"
                    : `Kotak ${player.position}`}
            </p>
          </div>
        );
      })}
    </div>
  );
}
