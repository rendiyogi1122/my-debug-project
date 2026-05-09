import type { GameState, PlayerState } from "@/types/database";

export const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60,
  87: 24, 93: 73, 95: 75, 99: 78,
};

export const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84,
  40: 59, 51: 67, 63: 81, 71: 91,
};

// ── Roll dadu ────────────────────────────────────────────────
export function rollDice(): {
  white1: number;
  white2: number;
  red: number;
  total: number;
  net: number;
} {
  const white1 = Math.floor(Math.random() * 6) + 1;
  const white2 = Math.floor(Math.random() * 6) + 1;
  const red    = Math.floor(Math.random() * 6) + 1;
  return {
    white1,
    white2,
    red,
    total: white1 + white2 + red,
    net:   white1 + white2 - red,   // gerakan = putih - merah
  };
}

// ── Cek apakah bisa keluar dari base ────────────────────────
// Butuh salah satu dadu putih = 6
export function canExitBase(white1: number, white2: number): boolean {
  return white1 === 6 || white2 === 6;
}

// ── Proses satu giliran ──────────────────────────────────────
export function processTurn(
  state: GameState,
  userId: string,
  roll: { white1: number; white2: number; red: number }
): { newState: GameState; events: string[] } {
  const events: string[] = [];
  const newState: GameState = JSON.parse(JSON.stringify(state)); // deep clone

  const playerIdx = newState.players.findIndex((p) => p.user_id === userId);
  if (playerIdx === -1) return { newState, events: ["ERROR: Pemain tidak ditemukan"] };

  const player = newState.players[playerIdx];
  const net = roll.white1 + roll.white2 - roll.red;

  // ── Pemain masih di base ─────────────────────────────────
  if (player.in_base) {
    if (canExitBase(roll.white1, roll.white2)) {
      player.position = 1;
      player.in_base  = false;
      events.push(`${player.color} keluar dari base! Posisi: 1`);
    } else {
      events.push(`${player.color} belum bisa keluar (butuh angka 6 di dadu putih)`);
    }
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurn(newState);
    return { newState, events };
  }

  // ── Pemain sudah di papan ────────────────────────────────
  let newPos = player.position + net;

  // Gerakan negatif tidak boleh kurang dari 1
  if (newPos < 1) {
    newPos = 1;
    events.push(`${player.color} tidak bisa mundur lebih jauh, tetap di 1`);
  }

  // Tepat 100 = menang
  if (newPos === 100) {
    player.position = 100;
    player.finished = true;
    events.push(`🏆 ${player.color} MENANG!`);
    // Cek apakah semua pemain aktif sudah finish
    const activePlayers = newState.players.filter((p) => !p.left);
    const allFinished   = activePlayers.every((p) => p.finished);
    if (allFinished || activePlayers.filter((p) => !p.finished).length <= 1) {
      newState.winner = userId;
    }
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurn(newState);
    return { newState, events };
  }

  // Lewat 100 = tidak bergerak (balik ke posisi semula)
  if (newPos > 100) {
    events.push(`${player.color} butuh tepat ${100 - player.position} langkah, giliran terlewat`);
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurn(newState);
    return { newState, events };
  }

  // Kotak 25 — efek spesial: random ke finish (100) atau balik ke awal (1)
  if (newPos === 25) {
    const toFinish = Math.random() < 0.5;
    if (toFinish) {
      newPos = 100;
      player.finished = true;
      events.push(`✨ ${player.color} mendarat di kotak 25 → langsung ke FINISH!`);
      newState.winner = userId;
    } else {
      newPos = 1;
      events.push(`💀 ${player.color} mendarat di kotak 25 → kembali ke awal!`);
    }
    player.position = newPos;
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurn(newState);
    return { newState, events };
  }

  // Cek ular
  if (SNAKES[newPos]) {
    const snakeTail = SNAKES[newPos];
    events.push(`🐍 ${player.color} kena ular! ${newPos} → ${snakeTail}`);
    newPos = snakeTail;
  }
  // Cek tangga
  else if (LADDERS[newPos]) {
    const ladderTop = LADDERS[newPos];
    events.push(`🪜 ${player.color} naik tangga! ${newPos} → ${ladderTop}`);
    newPos = ladderTop;
  }

  // Cek capture pemain lain
  const captured = newState.players.find(
    (p) =>
      p.user_id !== userId &&
      p.position === newPos &&
      !p.in_base &&
      !p.finished &&
      !p.left
  );
  if (captured) {
    captured.position = 0;
    captured.in_base  = true;
    events.push(`💥 ${player.color} capture ${captured.color}! ${captured.color} kembali ke base.`);
  }

  player.position = newPos;
  events.push(`${player.color} bergerak ke kotak ${newPos}`);

  newState.last_roll = { ...roll, by: userId };
  newState.current_turn_order = advanceTurn(newState);

  return { newState, events };
}

// ── Advance giliran ke pemain berikutnya yang aktif ──────────
export function advanceTurn(state: GameState): number {
  const active = state.players.filter((p) => !p.finished && !p.left);
  if (active.length <= 1) return state.current_turn_order;

  const orders  = active.map((p) => p.order).sort((a, b) => a - b);
  const current = state.current_turn_order;
  const next    = orders.find((o) => o > current) ?? orders[0];
  return next;
}

// ── Cek apakah game sudah selesai ───────────────────────────
export function isGameOver(state: GameState): boolean {
  return state.winner !== null;
}

// ── Dapatkan pemain yang sedang giliran ──────────────────────
export function getCurrentPlayer(state: GameState): PlayerState | undefined {
  return state.players.find(
    (p) => p.order === state.current_turn_order && !p.left
  );
}