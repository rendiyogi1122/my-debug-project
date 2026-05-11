"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { searchUsers, sendInvite } from "@/lib/actions/room";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface InvitePlayerModalProps {
  roomCode: string;
  roomId: string;
  onClose: () => void;
}

export function InvitePlayerModal({
  roomCode,
  roomId,
  onClose,
}: InvitePlayerModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input saat modal buka
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Tutup modal saat tekan Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const data = await searchUsers(value, roomId);
          setResults(data);
        } finally {
          setLoading(false);
        }
      }, 400);
    },
    [roomId],
  );

  const handleInvite = useCallback(
    async (profile: Profile) => {
      if (sentIds.has(profile.id) || sending) return;
      setSending(profile.id);
      setMessage(null);
      try {
        const result = await sendInvite(profile.id, roomCode);
        if (result?.success) {
          setSentIds((prev) => new Set(prev).add(profile.id));
          setMessage({
            text: `✅ Undangan terkirim ke ${profile.name}!`,
            type: "success",
          });

          // 🔔 Broadcast langsung ke channel penerima supaya realtime tanpa refresh
          const supabase = createClient();
          await supabase.channel(`invites:${profile.id}`).send({
            type: "broadcast",
            event: "new_invite",
            payload: { fromRoomCode: roomCode },
          });
        } else {
          setMessage({
            text: result?.message ?? "Gagal mengirim undangan.",
            type: "error",
          });
        }
      } catch {
        setMessage({ text: "Terjadi kesalahan. Coba lagi.", type: "error" });
      } finally {
        setSending(null);
      }
    },
    [sentIds, sending, roomCode],
  );

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--card)",
          border: "1.5px solid var(--border)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--t1)" }}>
              👥 Undang Pemain
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--t3)" }}>
              Cari teman berdasarkan nama
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ background: "var(--border)", color: "var(--t2)" }}
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="px-6 pb-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Ketik nama teman..."
              className="w-full pl-9 pr-4 py-3 rounded-2xl text-sm outline-none transition-all"
              style={{
                background: "var(--bg)",
                border: "1.5px solid var(--border)",
                color: "var(--t1)",
              }}
            />
          </div>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className="mx-6 mb-3 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: message.type === "success" ? "#F0FDF4" : "#FEF2F2",
              color: message.type === "success" ? "#166534" : "#991B1B",
              border: `1px solid ${message.type === "success" ? "#BBF7D0" : "#FECACA"}`,
            }}
          >
            {message.text}
          </div>
        )}

        {/* Results */}
        <div className="px-6 pb-6 min-h-30">
          {loading && (
            <div
              className="flex items-center justify-center py-8 gap-2"
              style={{ color: "var(--t3)" }}
            >
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin inline-block" />
              <span className="text-sm">Mencari...</span>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-3xl">🤷</span>
              <p className="text-sm" style={{ color: "var(--t3)" }}>
                Tidak ada pemain ditemukan
              </p>
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="text-3xl">✍️</span>
              <p className="text-sm" style={{ color: "var(--t3)" }}>
                Ketik minimal 2 karakter untuk mencari
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-2">
              {results.map((profile) => {
                const isSent = sentIds.has(profile.id);
                const isSending = sending === profile.id;
                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 p-3 rounded-2xl transition-colors"
                    style={{
                      background: isSent ? "#F0FDF4" : "var(--bg)",
                      border: `1.5px solid ${isSent ? "#BBF7D0" : "var(--border)"}`,
                    }}
                  >
                    {/* Avatar */}
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.name}
                        width={40}
                        height={40}
                        className="rounded-full shrink-0"
                        style={{ border: "2px solid white" }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ background: "#E5E7EB" }}
                      >
                        😊
                      </div>
                    )}

                    {/* Nama */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm truncate"
                        style={{ color: "var(--t1)" }}
                      >
                        {profile.name}
                      </p>
                    </div>

                    {/* Tombol undang */}
                    <button
                      onClick={() => handleInvite(profile)}
                      disabled={isSent || isSending}
                      className="shrink-0 px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: isSent
                          ? "#22C55E"
                          : isSending
                            ? "#E5E7EB"
                            : "var(--pp)",
                        color:
                          isSent || isSending
                            ? isSent
                              ? "white"
                              : "var(--t3)"
                            : "white",
                        cursor: isSent || isSending ? "not-allowed" : "pointer",
                        boxShadow:
                          isSent || isSending
                            ? "none"
                            : "0 2px 8px rgba(124,111,247,0.3)",
                      }}
                    >
                      {isSent ? "✓ Terkirim" : isSending ? "..." : "Undang"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
