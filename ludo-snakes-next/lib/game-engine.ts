import type { GameState, PlayerState } from "@/types/database";

export const SNAKES: Record<number, number> = {
  17: 7,
  32: 19,
  34: 21,
  36: 28,
  43: 24,
  46: 37,
  48: 35,
  49: 40,
};

export const LADDERS: Record<number, number> = {
  4: 14,
  9: 22,
  11: 26,
  20: 35,
  24: 38,
  28: 42,
  29: 44,
  31: 45,
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
  const red = Math.floor(Math.random() * 6) + 1;
  return {
    white1,
    white2,
    red,
    total: white1 + white2 + red,
    net: white1 + white2 - red, // gerakan = putih - merah
  };
}

// ── Cek apakah bisa keluar dari base ────────────────────────
// Butuh jumlah kedua dadu putih = 6
export function canExitBase(white1: number, white2: number): boolean {
  return white1 + white2 === 6;
}

// ── Advance turn dengan reset has_rolled ──────────────────
function advanceTurnAndReset(state: GameState, currentUserId: string): number {
  // Set has_rolled = true untuk pemain yang baru saja spin
  const currentPlayer = state.players.find((p) => p.user_id === currentUserId);
  if (currentPlayer) {
    currentPlayer.has_rolled = true;
  }

  // Advance ke pemain berikutnya
  const nextTurnOrder = advanceTurn(state);

  // Reset has_rolled = false untuk pemain berikutnya
  const nextPlayer = state.players.find((p) => p.order === nextTurnOrder);
  if (nextPlayer) {
    nextPlayer.has_rolled = false;
  }

  return nextTurnOrder;
}

// ── Proses satu giliran ──────────────────────────────────────
export function processTurn(
  state: GameState,
  userId: string,
  roll: { white1: number; white2: number; red: number },
): { newState: GameState; events: string[] } {
  const events: string[] = [];
  const newState: GameState = JSON.parse(JSON.stringify(state)); // deep clone

  const playerIdx = newState.players.findIndex((p) => p.user_id === userId);
  if (playerIdx === -1)
    return { newState, events: ["ERROR: Pemain tidak ditemukan"] };

  const player = newState.players[playerIdx];
  const net = roll.white1 + roll.white2 - roll.red;

  // ── Pemain masih di base ─────────────────────────────────
  if (player.in_base) {
    if (canExitBase(roll.white1, roll.white2)) {
      player.position = 1;
      player.in_base = false;
      events.push(`${player.color} keluar dari base! Posisi: 1`);
    } else {
      events.push(
        `${player.color} belum bisa keluar (butuh jumlah dadu putih = 6)`,
      );
    }
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurnAndReset(newState, userId);
    return { newState, events };
  }

  // ── Pemain sudah di papan ────────────────────────────────
  let newPos = player.position + net;

  // Gerakan negatif tidak boleh kurang dari 1
  if (newPos < 1) {
    newPos = 1;
    events.push(`${player.color} tidak bisa mundur lebih jauh, tetap di 1`);
  }

  // Tepat 50 = menang
  if (newPos === 50) {
    player.position = 50;
    player.finished = true;
    events.push(`🏆 ${player.color} MENANG!`);
    // Cek apakah semua pemain aktif sudah finish
    const activePlayers = newState.players.filter((p) => !p.left);
    const allFinished = activePlayers.every((p) => p.finished);
    if (allFinished || activePlayers.filter((p) => !p.finished).length <= 1) {
      newState.winner = userId;
    }
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurnAndReset(newState, userId);
    return { newState, events };
  }

  // Lewat 50 = tidak bergerak (balik ke posisi semula)
  if (newPos > 50) {
    events.push(
      `${player.color} butuh tepat ${50 - player.position} langkah, giliran terlewat`,
    );
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurnAndReset(newState, userId);
    return { newState, events };
  }

  // Kotak 25 — efek spesial: random ke finish (50) atau balik ke awal (1)
  if (newPos === 25) {
    const toFinish = Math.random() < 0.5;
    if (toFinish) {
      newPos = 50;
      player.finished = true;
      events.push(
        `✨ ${player.color} mendarat di kotak 25 → langsung ke FINISH!`,
      );
      // Set winner hanya jika ini adalah pemain terakhir yang bisa selesai
      const activePlayers = newState.players.filter((p) => !p.left);
      const stillActive = activePlayers.filter((p) => !p.finished);
      if (stillActive.length <= 1) {
        newState.winner = userId;
      }
    } else {
      newPos = 1;
      events.push(`💀 ${player.color} mendarat di kotak 25 → kembali ke awal!`);
    }
    player.position = newPos;
    newState.last_roll = { ...roll, by: userId };
    newState.current_turn_order = advanceTurnAndReset(newState, userId);
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
      !p.left,
  );
  if (captured) {
    captured.position = 0;
    captured.in_base = true;
    events.push(
      `💥 ${player.color} capture ${captured.color}! ${captured.color} kembali ke base.`,
    );
  }

  player.position = newPos;
  events.push(`${player.color} bergerak ke kotak ${newPos}`);

  newState.last_roll = { ...roll, by: userId };
  newState.current_turn_order = advanceTurnAndReset(newState, userId);

  return { newState, events };
}

// ── Advance giliran ke pemain berikutnya yang aktif ──────────
export function advanceTurn(state: GameState): number {
  // Filter pemain yang masih aktif (belum finish, belum left)
  const activePlayers = state.players.filter((p) => !p.finished && !p.left);

  // Jika hanya 1 pemain atau tidak ada pemain aktif, jangan ubah giliran
  if (activePlayers.length <= 1) {
    return state.current_turn_order;
  }

  // Dapatkan semua order dari pemain aktif, di-sort ascending
  const orders = activePlayers.map((p) => p.order).sort((a, b) => a - b);
  const currentOrder = state.current_turn_order;

  // Cari order berikutnya yang lebih besar dari current
  let nextOrder = orders.find((o) => o > currentOrder);

  // Jika tidak ada yang lebih besar, kembali ke order terkecil (cycling)
  if (nextOrder === undefined) {
    nextOrder = orders[0];
  }

  // Pastikan nextOrder adalah valid dan ada di active players
  if (
    nextOrder === undefined ||
    !activePlayers.find((p) => p.order === nextOrder)
  ) {
    return currentOrder; // Fallback: jangan ubah jika invalid
  }

  return nextOrder;
}

// ── Cek apakah game sudah selesai ───────────────────────────
export function isGameOver(state: GameState): boolean {
  return state.winner !== null;
}

// ── Dapatkan pemain yang sedang giliran ──────────────────────
export function getCurrentPlayer(state: GameState): PlayerState | undefined {
  const player = state.players.find(
    (p) => p.order === state.current_turn_order && !p.left,
  );

  // Fallback: jika tidak menemukan, kembalikan pemain aktif pertama dengan order terkecil
  if (!player && state.players.length > 0) {
    const activePlayers = state.players
      .filter((p) => !p.finished && !p.left)
      .sort((a, b) => a.order - b.order);
    return activePlayers[0];
  }

  return player;
}
