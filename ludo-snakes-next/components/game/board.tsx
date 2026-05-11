"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { SNAKES, LADDERS } from "@/lib/game-engine";
import type { PlayerState } from "@/types/database";

export interface AnimatingPlayer {
  userId: string;
  fromPos: number;
  /** untuk walk = posisi akhir sebelum snake/ladder; untuk snake = headNum; untuk ladder = botNum */
  toPos: number;
  type: "walk" | "snake" | "ladder";
  onDone?: () => void;
}

interface BoardProps {
  players: PlayerState[];
  animatingPlayer?: AnimatingPlayer | null;
}

// Warna pion
const PION_COLORS: Record<string, string> = {
  red: "#e63946",
  blue: "#2196F3",
  green: "#4caf50",
  yellow: "#ff9800",
};

const COLS = 10;
const ROWS = 5;
const CS = 60;

function cellXY(n: number) {
  const rb = Math.floor((n - 1) / 10);
  const pi = (n - 1) % 10;
  const col = rb % 2 === 0 ? pi : 9 - pi;
  const row = ROWS - 1 - rb;
  return { x: col * CS, y: row * CS };
}
function cellCenter(n: number) {
  const { x, y } = cellXY(n);
  return { x: x + CS / 2, y: y + CS / 2 };
}
function getCellColor(n: number) {
  if (n === 1) return { bg: "#1565c0", fg: "#fff" };
  if (n === 25) return { bg: "#f59e0b", fg: "#fff" };
  if (n === 50) return { bg: "#16a34a", fg: "#fff" };
  return n % 2 === 1 ? { bg: "#ffffff", fg: "#111111" } : { bg: "#111111", fg: "#ffffff" };
}
function bezierPoint(t: number, p0: number, p1: number, p2: number, p3: number) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}
function dk(hex: string, amt: number) {
  if (!hex || hex.length < 7) return hex;
  return "#" + [1, 3, 5].map((i) =>
    Math.max(0, Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - amt))).toString(16).padStart(2, "0")
  ).join("");
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, COLS * CS, ROWS * CS);
  for (let n = 1; n <= 50; n++) {
    const { x, y } = cellXY(n);
    const { bg } = getCellColor(n);
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, CS, CS);
    ctx.strokeStyle = "rgba(120,120,120,0.3)";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, CS, CS);
  }
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, 0, COLS * CS, ROWS * CS);
  const { x: x25, y: y25 } = cellXY(25);
  ctx.font = `bold ${Math.round(CS * 0.18)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#fff";
  ctx.fillText("?", x25 + CS / 2, y25 + CS / 2 + CS * 0.12);
  ctx.font = `bold ${Math.round(CS * 0.14)}px sans-serif`;
  ctx.fillText("MISTERI", x25 + CS / 2, y25 + CS / 2 - CS * 0.2);
}

function drawNumbers(ctx: CanvasRenderingContext2D, excludeSet: Set<number>) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${Math.round(CS * 0.23)}px sans-serif`;
  for (let n = 1; n <= 50; n++) {
    if (excludeSet.has(n) || n === 25) continue;
    const { x, y } = cellXY(n);
    const { fg } = getCellColor(n);
    ctx.fillStyle = fg;
    ctx.fillText(String(n), x + CS / 2, y + CS / 2);
  }
}

function drawSnake(ctx: CanvasRenderingContext2D, headNum: number, tailNum: number, curveDir: number) {
  const h = cellCenter(headNum);
  const t = cellCenter(tailNum);
  const dx = t.x - h.x, dy = t.y - h.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const perp = { x: -dy / dist, y: dx / dist };
  const amp = Math.min(44, dist * 0.42) * curveDir;
  const cp1 = { x: h.x + dx * 0.28 + perp.x * amp, y: h.y + dy * 0.28 + perp.y * amp };
  const cp2 = { x: h.x + dx * 0.72 - perp.x * amp * 0.7, y: h.y + dy * 0.72 - perp.y * amp * 0.7 };
  const N = 90;
  for (let i = 3; i <= N - 1; i++) {
    const t0 = i / N, t1 = (i - 1) / N;
    const x0 = bezierPoint(t0, h.x, cp1.x, cp2.x, t.x), y0 = bezierPoint(t0, h.y, cp1.y, cp2.y, t.y);
    const x1 = bezierPoint(t1, h.x, cp1.x, cp2.x, t.x), y1 = bezierPoint(t1, h.y, cp1.y, cp2.y, t.y);
    const frac = 1 - t1;
    const bw = CS * 0.175 * frac + CS * 0.028;
    const stripe = Math.floor(t0 * 16) % 2;
    ctx.strokeStyle = stripe === 0 ? "#2d9e3a" : "#d4f5d8";
    ctx.lineWidth = bw; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  for (let i = 3; i <= N - 1; i++) {
    const t0 = i / N, t1 = (i - 1) / N;
    const x0 = bezierPoint(t0, h.x, cp1.x, cp2.x, t.x), y0 = bezierPoint(t0, h.y, cp1.y, cp2.y, t.y);
    const x1 = bezierPoint(t1, h.x, cp1.x, cp2.x, t.x), y1 = bezierPoint(t1, h.y, cp1.y, cp2.y, t.y);
    const frac = 1 - t1;
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = (CS * 0.175 * frac + CS * 0.028) * 0.32; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  const te = 0.97;
  const etx = bezierPoint(te, h.x, cp1.x, cp2.x, t.x);
  const ety = bezierPoint(te, h.y, cp1.y, cp2.y, t.y);
  const tailAngle = Math.atan2(t.y - ety, t.x - etx);
  ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(tailAngle);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-CS * 0.18, -CS * 0.05); ctx.lineTo(-CS * 0.18, CS * 0.05); ctx.closePath();
  ctx.fillStyle = "#1a6b22"; ctx.fill(); ctx.strokeStyle = "#145018"; ctx.lineWidth = 0.6; ctx.stroke(); ctx.restore();
  const headFwdAngle = Math.atan2(h.y - bezierPoint(0.05, h.y, cp1.y, cp2.y, t.y), h.x - bezierPoint(0.05, h.x, cp1.x, cp2.x, t.x));
  const R = CS * 0.155;
  ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(headFwdAngle);
  ctx.beginPath(); ctx.ellipse(-R * 0.25, 0, R * 0.72, R * 0.52, 0, 0, Math.PI * 2); ctx.fillStyle = "#2a7d32"; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(R * 0.05, -R * 0.88); ctx.bezierCurveTo(R * 1.55, -R * 0.98, R * 2.1, -R * 0.52, R * 2.1, 0);
  ctx.bezierCurveTo(R * 2.1, R * 0.52, R * 1.55, R * 0.98, R * 0.05, R * 0.88);
  ctx.bezierCurveTo(-R * 0.45, R * 0.62, -R * 0.58, R * 0.3, -R * 0.58, 0);
  ctx.bezierCurveTo(-R * 0.58, -R * 0.3, -R * 0.45, -R * 0.62, R * 0.05, -R * 0.88);
  ctx.fillStyle = "#33a03c"; ctx.fill(); ctx.strokeStyle = "#1a6025"; ctx.lineWidth = 1.3; ctx.stroke();
  ctx.globalAlpha = 0.22;
  [0.5, 0.88, 1.28].forEach((ex) => { ctx.beginPath(); ctx.arc(ex * R, 0, R * 0.52, Math.PI * 0.62, Math.PI * 1.38); ctx.strokeStyle = "#145018"; ctx.lineWidth = 0.9; ctx.stroke(); });
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.ellipse(R * 0.65, -R * 0.28, R * 0.48, R * 0.2, Math.PI * 0.18, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill();
  const drawEye = (ex: number, ey: number, flip: number) => {
    ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.3, R * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = "#fffde7"; ctx.fill(); ctx.strokeStyle = "#1a5c20"; ctx.lineWidth = 0.9; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(ex, ey, R * 0.22, R * 0.28, 0, 0, Math.PI * 2); ctx.fillStyle = "#f9a825"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + R * 0.05, ey, R * 0.1, R * 0.22, 0.15 * flip, 0, Math.PI * 2); ctx.fillStyle = "#111"; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + R * 0.08, ey - R * 0.11, R * 0.075, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(ex - R * 0.3, ey - R * 0.08 * flip); ctx.quadraticCurveTo(ex, ey - R * 0.45 * flip, ex + R * 0.3, ey - R * 0.08 * flip); ctx.strokeStyle = "#1a5c20"; ctx.lineWidth = 0.8; ctx.stroke();
  };
  drawEye(R * 1.18, -R * 0.54, 1);
  drawEye(R * 1.18, R * 0.54, -1);
  ctx.restore();
}

function drawLadder(ctx: CanvasRenderingContext2D, bot: number, top: number) {
  const b = cellCenter(bot), t = cellCenter(top);
  const dx = t.x - b.x, dy = t.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / dist * 7.5, py = dx / dist * 7.5;
  ctx.lineCap = "round";
  [1, -1].forEach((s) => {
    ctx.beginPath(); ctx.moveTo(b.x + px * s, b.y + py * s); ctx.lineTo(t.x + px * s, t.y + py * s);
    ctx.strokeStyle = "#4a2000"; ctx.lineWidth = 6; ctx.stroke();
    ctx.strokeStyle = "#8B4513"; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = "rgba(205,133,63,0.5)"; ctx.lineWidth = 1.2; ctx.stroke();
  });
  const steps = Math.max(3, Math.round(dist / 20));
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    const rx = b.x + dx * f, ry = b.y + dy * f;
    ctx.beginPath(); ctx.moveTo(rx - px * 1.4, ry - py * 1.4); ctx.lineTo(rx + px * 1.4, ry + py * 1.4);
    ctx.strokeStyle = "#3e1a00"; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = "#a0522d"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = "rgba(230,180,100,0.38)"; ctx.lineWidth = 1; ctx.stroke();
  }
  [b, t].forEach((pt) => [1, -1].forEach((s) => {
    ctx.beginPath(); ctx.arc(pt.x + px * s, pt.y + py * s, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#5c2800"; ctx.fill(); ctx.strokeStyle = "#cd853f"; ctx.lineWidth = 1; ctx.stroke();
  }));
}

function drawPion(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  const r = CS * 0.255;
  ctx.beginPath(); ctx.ellipse(cx + 1, cy + r * 0.42, r * 0.66, r * 0.14, 0, 0, Math.PI * 2); ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.3, r * 0.74, r * 0.16, 0, 0, Math.PI * 2);
  const baseG = ctx.createLinearGradient(cx - r * 0.74, cy + r * 0.3, cx + r * 0.74, cy + r * 0.3);
  baseG.addColorStop(0, dk(color, 0.38)); baseG.addColorStop(0.5, color); baseG.addColorStop(1, dk(color, 0.28));
  ctx.fillStyle = baseG; ctx.fill(); ctx.strokeStyle = dk(color, 0.4); ctx.lineWidth = 0.7; ctx.stroke();
  const bodyG = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bodyG.addColorStop(0, "rgba(255,255,255,0.85)"); bodyG.addColorStop(0.15, color + "ee"); bodyG.addColorStop(0.7, color); bodyG.addColorStop(1, dk(color, 0.42));
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.52, cy + r * 0.24); ctx.bezierCurveTo(cx - r * 0.52, cy - r * 0.02, cx - r * 0.3, cy - r * 0.52, cx, cy - r * 0.66);
  ctx.bezierCurveTo(cx + r * 0.3, cy - r * 0.52, cx + r * 0.52, cy - r * 0.02, cx + r * 0.52, cy + r * 0.24);
  ctx.closePath(); ctx.fillStyle = bodyG; ctx.fill(); ctx.strokeStyle = dk(color, 0.32); ctx.lineWidth = 0.8; ctx.stroke();
  const headG = ctx.createRadialGradient(cx - r * 0.12, cy - r * 0.9, 0, cx, cy - r * 0.68, r * 0.42);
  headG.addColorStop(0, "rgba(255,255,255,0.88)"); headG.addColorStop(0.35, color + "ee"); headG.addColorStop(1, dk(color, 0.33));
  ctx.beginPath(); ctx.arc(cx, cy - r * 0.68, r * 0.4, 0, Math.PI * 2); ctx.fillStyle = headG; ctx.fill(); ctx.strokeStyle = dk(color, 0.3); ctx.lineWidth = 0.8; ctx.stroke();
  ctx.beginPath(); ctx.rect(cx - r * 0.3, cy - r * 1.12, r * 0.6, r * 0.16);
  const neckG = ctx.createLinearGradient(cx - r * 0.3, 0, cx + r * 0.3, 0);
  neckG.addColorStop(0, dk(color, 0.35)); neckG.addColorStop(0.5, color); neckG.addColorStop(1, dk(color, 0.25));
  ctx.fillStyle = neckG; ctx.fill(); ctx.strokeStyle = dk(color, 0.35); ctx.lineWidth = 0.5; ctx.stroke();
  const cW = r * 0.72, cH = r * 0.3, cY = cy - r * 1.12;
  const crownG = ctx.createLinearGradient(cx, cY - cH, cx, cY);
  crownG.addColorStop(0, "rgba(255,255,255,0.9)"); crownG.addColorStop(0.4, color + "dd"); crownG.addColorStop(1, dk(color, 0.28));
  ctx.beginPath();
  ctx.moveTo(cx - cW / 2, cY); ctx.lineTo(cx - cW / 2, cY - cH * 0.6); ctx.lineTo(cx - cW * 0.28, cY - cH); ctx.lineTo(cx - cW * 0.1, cY - cH * 0.5);
  ctx.lineTo(cx, cY - cH * 0.95); ctx.lineTo(cx + cW * 0.1, cY - cH * 0.5); ctx.lineTo(cx + cW * 0.28, cY - cH); ctx.lineTo(cx + cW / 2, cY - cH * 0.6);
  ctx.lineTo(cx + cW / 2, cY); ctx.closePath();
  ctx.fillStyle = crownG; ctx.fill(); ctx.strokeStyle = dk(color, 0.38); ctx.lineWidth = 0.85; ctx.stroke();
  [[cx - cW * 0.28, cY - cH], [cx, cY - cH * 0.95], [cx + cW * 0.28, cY - cH]].forEach(([px2, py2]) => {
    ctx.beginPath(); ctx.arc(px2, py2, r * 0.075, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,220,0.95)"; ctx.fill(); ctx.strokeStyle = dk(color, 0.3); ctx.lineWidth = 0.4; ctx.stroke();
  });
  ctx.beginPath(); ctx.arc(cx - r * 0.14, cy - r * 0.78, r * 0.12, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.fill();
}

function buildStepPath(from: number, to: number) {
  const path: { x: number; y: number }[] = [];
  let cur = from;
  const step = to > from ? 1 : -1;
  while (cur !== to) { cur += step; path.push(cellCenter(cur)); }
  return path;
}
function buildSnakePath(headNum: number, tailNum: number, curveDir: number) {
  const h = cellCenter(headNum), t = cellCenter(tailNum);
  const dx = t.x - h.x, dy = t.y - h.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const perp = { x: -dy / dist, y: dx / dist };
  const amp = Math.min(44, dist * 0.42) * curveDir;
  const cp1 = { x: h.x + dx * 0.28 + perp.x * amp, y: h.y + dy * 0.28 + perp.y * amp };
  const cp2 = { x: h.x + dx * 0.72 - perp.x * amp * 0.7, y: h.y + dy * 0.72 - perp.y * amp * 0.7 };
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 40; i++) { const t2 = i / 40; pts.push({ x: bezierPoint(t2, h.x, cp1.x, cp2.x, t.x), y: bezierPoint(t2, h.y, cp1.y, cp2.y, t.y) }); }
  return pts;
}
function buildLadderPath(bot: number, top: number) {
  const b = cellCenter(bot), t = cellCenter(top);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 30; i++) { const f = i / 30; pts.push({ x: b.x + (t.x - b.x) * f, y: b.y + (t.y - b.y) * f }); }
  return pts;
}

const SNAKE_DIRS = [1, -1, 1, -1, 1, 1, -1, 1];

function fullRedraw(
  ctx: CanvasRenderingContext2D,
  players: PlayerState[],
  animState: { userId: string; pos: { x: number; y: number } } | null,
) {
  const positionMap: Record<number, PlayerState[]> = {};
  players.forEach((p) => {
    if (p.in_base || p.position <= 0) return;
    if (animState && p.user_id === animState.userId) return;
    if (!positionMap[p.position]) positionMap[p.position] = [];
    positionMap[p.position].push(p);
  });
  const occupied = new Set<number>(Object.keys(positionMap).map(Number));

  drawBoard(ctx);
  Object.entries(LADDERS).forEach(([b, t]) => drawLadder(ctx, +b, t));
  Object.entries(SNAKES).forEach(([h, t], i) => drawSnake(ctx, +h, t, SNAKE_DIRS[i] ?? 1));
  drawNumbers(ctx, occupied);

  Object.entries(positionMap).forEach(([pos, ps]) => {
    const cen = cellCenter(+pos);
    const offs =
      ps.length === 1 ? [[0, 0]] :
      ps.length === 2 ? [[-CS * 0.2, 0], [CS * 0.2, 0]] :
      ps.length === 3 ? [[-CS * 0.22, -CS * 0.1], [CS * 0.22, -CS * 0.1], [0, CS * 0.15]] :
      [[-CS * 0.19, -CS * 0.14], [CS * 0.19, -CS * 0.14], [-CS * 0.19, CS * 0.14], [CS * 0.19, CS * 0.14]];
    const sc = ps.length > 1 ? 0.68 : 1;
    ps.forEach((p, i) => {
      const [ox, oy] = offs[i] ?? [0, 0];
      ctx.save(); ctx.translate(cen.x + ox, cen.y + oy); ctx.scale(sc, sc);
      drawPion(ctx, 0, 0, PION_COLORS[p.color] ?? "#888");
      ctx.restore();
    });
  });

  if (animState) {
    const p = players.find((pl) => pl.user_id === animState.userId);
    if (p) {
      ctx.save(); ctx.translate(animState.pos.x, animState.pos.y);
      drawPion(ctx, 0, 0, PION_COLORS[p.color] ?? "#888");
      ctx.restore();
    }
  }
}

export function Board({ players, animatingPlayer }: BoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef<{
    userId: string;
    path: { x: number; y: number }[];
    t: number;
    speed: number;
    onDone?: () => void;
  } | null>(null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  }, []);

  const getAnimPos = useCallback((an: { path: { x: number; y: number }[]; t: number }) => {
    const s = Math.floor(an.t);
    const frac = an.t - s;
    if (s >= an.path.length - 1) return an.path[an.path.length - 1];
    const a = an.path[s], b = an.path[s + 1];
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
  }, []);

  // Mutable ref for latest players (to use in animation loop without stale closure)
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  const redrawWithAnim = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const an = animRef.current;
    const animPos = an ? { userId: an.userId, pos: getAnimPos(an) } : null;
    fullRedraw(ctx, playersRef.current, animPos);
  }, [getCtx, getAnimPos]);

  const startAnim = useCallback((
    userId: string,
    path: { x: number; y: number }[],
    speed: number,
    onDone?: () => void,
  ) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    animRef.current = { userId, path, t: 0, speed, onDone };
    function tick() {
      const an = animRef.current;
      if (!an) return;
      an.t += an.speed;
      if (an.t >= an.path.length - 1) {
        an.t = an.path.length - 1;
        redrawWithAnim();
        animRef.current = null;
        rafRef.current = null;
        an.onDone?.();
        return;
      }
      redrawWithAnim();
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [redrawWithAnim]);

  // Setup canvas sekali
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = COLS * CS;
    canvas.height = ROWS * CS;
    const ctx = canvas.getContext("2d");
    if (ctx) fullRedraw(ctx, players, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle animasi baru
  useEffect(() => {
    if (!animatingPlayer) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      animRef.current = null;
      const ctx = getCtx();
      if (ctx) fullRedraw(ctx, players, null);
      return;
    }

    const { userId, fromPos, toPos, type, onDone } = animatingPlayer;
    let path: { x: number; y: number }[];
    let speed: number;

    if (type === "walk") {
      path = buildStepPath(fromPos, toPos);
      speed = 0.2;
    } else if (type === "snake") {
      const walkPath = buildStepPath(fromPos, toPos);
      const tailNum = SNAKES[toPos];
      if (tailNum !== undefined) {
        const snakeIdx = Object.keys(SNAKES).indexOf(String(toPos));
        const snakePath = buildSnakePath(toPos, tailNum, SNAKE_DIRS[snakeIdx] ?? 1);
        path = [...walkPath, ...snakePath];
      } else {
        path = walkPath;
      }
      speed = 0.22;
    } else {
      const walkPath = buildStepPath(fromPos, toPos);
      const ladderTop = LADDERS[toPos];
      if (ladderTop !== undefined) {
        const ladderPath = buildLadderPath(toPos, ladderTop);
        path = [...walkPath, ...ladderPath];
      } else {
        path = walkPath;
      }
      speed = 0.2;
    }

    if (path.length === 0) {
      const ctx = getCtx();
      if (ctx) fullRedraw(ctx, players, null);
      onDone?.();
      return;
    }

    startAnim(userId, path, speed, onDone);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animatingPlayer]);

  // Redraw statis ketika players berubah & tidak ada animasi
  useEffect(() => {
    if (animatingPlayer) return;
    if (animRef.current) return;
    const ctx = getCtx();
    if (ctx) fullRedraw(ctx, players, null);
  }, [players, animatingPlayer, getCtx]);

  return (
    <div className="w-full max-w-lg mx-auto">
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          aspectRatio: "1/1",
          borderRadius: 10,
          border: "0.5px solid var(--border)",
        }}
      />
      <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 10, flexWrap: "wrap", fontSize: 12, color: "var(--t3)" }}>
        {players.filter((p) => !p.left).map((p) => (
          <span key={p.user_id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: PION_COLORS[p.color] ?? "#888", display: "inline-block" }} />
            {p.color.charAt(0).toUpperCase() + p.color.slice(1)}
            {p.in_base ? " (base)" : p.finished ? " ✓" : ` (${p.position})`}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 4, background: "#f59e0b", display: "inline-block" }} />
          Kotak 25: random!
        </span>
      </div>
    </div>
  );
}
