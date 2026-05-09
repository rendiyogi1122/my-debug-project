"use client";

import { cn } from "@/lib/utils";
import { SNAKES, LADDERS } from "@/lib/game-engine";
import type { PlayerState } from "@/types/database";

interface BoardProps {
  players: PlayerState[];
}

const COLOR_STYLES: Record<string, string> = {
  red:    "bg-red-500 ring-red-300",
  blue:   "bg-blue-500 ring-blue-300",
  green:  "bg-green-500 ring-green-300",
  yellow: "bg-yellow-400 ring-yellow-200",
};

const SPECIAL_CELLS: Record<number, string> = {
  25: "bg-purple-500/20 border-purple-500/40",
  100: "bg-yellow-500/20 border-yellow-500/40",
};

// Papan Ludo: baris teratas = 100, terbawah = 1
// Baris genap (dari bawah) kiri→kanan, baris ganjil kanan→kiri
function getCellNumber(row: number, col: number): number {
  const rowFromBottom = 9 - row; // 0 = baris bawah
  const baseNumber    = rowFromBottom * 10;
  if (rowFromBottom % 2 === 0) {
    return baseNumber + col + 1;       // kiri ke kanan
  } else {
    return baseNumber + (9 - col) + 1; // kanan ke kiri
  }
}

export function Board({ players }: BoardProps) {
  // Map posisi → list pemain di sana
  const positionMap: Record<number, PlayerState[]> = {};
  players.forEach((p) => {
    if (!p.in_base && p.position > 0) {
      if (!positionMap[p.position]) positionMap[p.position] = [];
      positionMap[p.position].push(p);
    }
  });

  const snakeHeads = Object.keys(SNAKES).map(Number);
  const ladderBots = Object.keys(LADDERS).map(Number);

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="grid grid-cols-10 gap-0.5 bg-slate-700 p-0.5 rounded-xl">
        {Array.from({ length: 10 }, (_, row) =>
          Array.from({ length: 10 }, (_, col) => {
            const num = getCellNumber(row, col);
            const here = positionMap[num] ?? [];
            const isSnakeHead = snakeHeads.includes(num);
            const isLadderBot = ladderBots.includes(num);
            const isSpecial   = SPECIAL_CELLS[num];

            return (
              <div
                key={num}
                className={cn(
                  "relative flex flex-col items-center justify-center",
                  "aspect-square rounded-sm border",
                  "bg-slate-800 border-slate-700",
                  isSpecial,
                  isSnakeHead && "border-red-500/50 bg-red-500/10",
                  isLadderBot && "border-green-500/50 bg-green-500/10"
                )}
              >
                {/* Nomor kotak */}
                <span className="text-[8px] text-slate-500 leading-none mb-0.5">
                  {num}
                </span>

                {/* Icon ular/tangga */}
                {isSnakeHead && (
                  <span className="text-[10px] leading-none">🐍</span>
                )}
                {isLadderBot && (
                  <span className="text-[10px] leading-none">🪜</span>
                )}
                {num === 25 && (
                  <span className="text-[10px] leading-none">⭐</span>
                )}
                {num === 100 && (
                  <span className="text-[10px] leading-none">🏆</span>
                )}

                {/* Pion pemain */}
                {here.length > 0 && (
                  <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-0.5 p-0.5">
                    {here.map((p) => (
                      <div
                        key={p.user_id}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full ring-1",
                          COLOR_STYLES[p.color]
                        )}
                        title={p.color}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}