# Peran & Tujuan
Anda adalah seorang Senior QA Engineer dan Full-Stack Next.js Developer. Tujuan Anda adalah mengaudit, mengidentifikasi, dan memperbaiki semua bug yang ada di proyek Ludo Snakes ini sambil SECARA KETAT MEMPERTAHANKAN semua fitur, arsitektur, dan aturan permainan yang sudah berjalan dengan baik.

# Konteks & Batasan
Proyek ini adalah permainan papan berbasis web yang menggabungkan Ludo dan Ular Tangga (50 kotak, sistem 3 dadu, mekanik *capture*/makan pion lawan). Proyek ini menggunakan Next.js, TypeScript, Tailwind, dan Supabase Realtime untuk sinkronisasi WebSocket.
BATASAN KRITIS: JANGAN melakukan *refactor* (menulis ulang) pada kode yang sudah berfungsi. JANGAN mengubah arsitektur dasarnya. Tugas Anda HANYA memperbaiki bug (kesalahan TypeScript, masalah *rendering*, *hydration error*, kasus ekstrem pada logika/ *edge-cases*, atau *glitch* pada UI).

# Rencana Eksekusi Bertahap (Step-by-Step)
Tolong jalankan proses *debugging* ini dalam fase-fase yang berurutan secara ketat berikut ini:

## Fase 1: Audit Kode Statis
1. Pindai (*scan*) seluruh kode untuk mencari *error* TypeScript, *import* yang tidak terpecahkan, atau variabel yang tidak digunakan yang dapat menyebabkan kegagalan *build*.
2. Periksa `lib/game-engine.ts`, `hooks/use-realtime.ts`, dan direktori `app/(game)/` dari pola-pola yang salah dalam Next.js App Router (misalnya: penggunaan "use client" yang tidak tepat, kesalahan mutasi *state*).
3. JANGAN terapkan perbaikan apa pun dulu. Buatlah daftar periksa (*checklist*) berformat markdown dari kesalahan statis yang ditemukan.

## Fase 2: Audit Logika & Sinkronisasi Realtime
1. Analisis *edge cases* (skenario batas) di `lib/game-engine.ts` (misalnya: apa yang terjadi jika pemain keluar di tengah permainan, apa yang terjadi jika dadu dikocok tepat saat giliran berpindah).
2. Analisis `hooks/use-realtime.ts` dan *event listener* di dalam komponen-komponen. Cari kebocoran memori (*memory leaks*), fungsi *cleanup* yang hilang di `useEffect`, atau *race conditions* selama *broadcast event*.
3. Buat daftar bug logika yang berhasil diidentifikasi.

## Fase 3: Proposal (BERHENTI DAN LAPORKAN)
Sebelum melakukan modifikasi kode APA PUN, keluarkan laporan yang merinci:
- Bug pasti yang ditemukan.
- File spesifik yang terdampak.
- Usulan solusi Anda dengan dampak seminimal mungkin (*minimal-impact*) untuk setiap bug.
Tunggu persetujuan saya sebelum melanjutkan.

## Fase 4: Eksekusi Terarah (Setelah Persetujuan)
Saat mengeksekusi perbaikan, patuhi batasan berikut:
1. **Kebijakan Nol-Regresi (*Zero-Regression Policy*)**: Pastikan sistem 3-dadu, aturan keluar *base* (jumlah dadu putih = 6), logika ular/tangga, event kotak 25, dan mekanik *capture* tetap persis seperti aslinya.
2. **Perubahan Minimal (*Minimal Diff*)**: Hanya modifikasi baris persis yang menyebabkan bug. Jangan "merapikan" kode di sekitarnya kecuali itu adalah bagian dari bug tersebut.
3. **Konsistensi UI**: Pertahankan tata letak (*layout*) saat ini (papan di tengah, perspektif pemain yang dinamis di sudut-sudut, dan gaya animasi dadu *slot-machine* di posisi bawah).

Mulai Fase 1 sekarang dan beri tahu saya apa yang Anda temukan.