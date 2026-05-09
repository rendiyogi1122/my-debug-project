"use client";

import { joinRoom } from "@/lib/actions/room";

export function JoinRoomInput() {
  return (
    <form action={joinRoom} className="flex gap-2">
      <input
        name="room_code"
        maxLength={6}
        placeholder="ABC123"
        className="flex-1 rounded-2xl px-4 py-2.5 text-sm uppercase tracking-widest focus:outline-none transition-all"
        style={{
          background: "var(--bg)",
          border: "1.5px solid var(--border)",
          color: "var(--t1)",
          fontFamily: "var(--font-mono)",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--pp)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      <button
        type="submit"
        className="px-4 py-2.5 rounded-2xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
        style={{
          background: "var(--pp-l)",
          color: "var(--pp)",
          border: "1.5px solid rgba(124,111,247,.2)",
        }}
      >
        Masuk →
      </button>
    </form>
  );
}