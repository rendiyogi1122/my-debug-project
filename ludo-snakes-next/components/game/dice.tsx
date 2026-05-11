"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DiceProps {
  value: number;
  color: "white" | "red";
  rolling?: boolean;
}

const DOTS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [25, 25],
    [75, 25],
    [25, 50],
    [75, 50],
    [25, 75],
    [75, 75],
  ],
};

export function Dice({ value, color, rolling = false }: DiceProps) {
  const dots = DOTS[value] ?? DOTS[1];
  const isRed = color === "red";

  return (
    <div
      className={cn(
        "relative w-12 h-12 rounded-xl border-2 shadow-lg transition-transform",
        isRed ? "bg-red-900 border-red-500" : "bg-white border-slate-300",
        rolling && "animate-bounce",
      )}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={10}
            fill={isRed ? "#fca5a5" : "#1e293b"}
          />
        ))}
      </svg>
    </div>
  );
}

interface DiceGroupProps {
  white1: number;
  white2: number;
  red: number;
  rolling?: boolean;
}

export function DiceGroup({ white1, white2, red, rolling }: DiceGroupProps) {
  return (
    <div className="flex items-center gap-3">
      <Dice value={white1} color="white" rolling={rolling} />
      <Dice value={white2} color="white" rolling={rolling} />
      <span className="text-slate-500 text-lg">−</span>
      <Dice value={red} color="red" rolling={rolling} />
    </div>
  );
}
