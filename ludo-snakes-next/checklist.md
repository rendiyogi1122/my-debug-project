<!-- fase 1
    npm run dev berjalan tanpa error
    Halaman localhost:3000 tampil teks "Ludo Snakes — coming soon"
    Struktur folder sudah terbentuk sesuai Step 1.5
    File .env.local sudah dibuat (walau masih kosong nilainya)
    File lib/utils.ts sudah ada -->

<!-- fase 2
    Project Supabase sudah dibuat dengan region Singapore
    .env.local sudah diisi URL dan anon key
    Semua tabel (profiles, rooms, room_players, invites) sudah terbuat
    RLS dan semua policies sudah aktif
    Google OAuth sudah terhubung di Supabase
    File lib/supabase/client.ts dan lib/supabase/server.ts sudah ada
    File types/database.ts sudah ada
    Halaman /test-db menampilkan "Koneksi berhasil!" -->

<!-- fase 3
    File middleware.ts sudah ada di root project
    File app/auth/callback/route.ts sudah ada
    File lib/actions/auth.ts sudah ada
    Halaman /login tampil dengan tombol Google
    Klik tombol login → diarahkan ke Google OAuth
    Setelah login Google → redirect ke /dashboard
    User muncul di Supabase → Authentication → Users
    Tabel profiles terisi otomatis
    Tombol logout berfungsi → kembali ke /login
    Akses /dashboard tanpa login → redirect ke /login -->

<!-- fase 4
    lib/actions/room.ts sudah ada dengan semua fungsi
    Komponen Button dan Card sudah ada di components/ui/
    Navbar tampil dengan avatar dan nama user
    Halaman /dashboard tampil dengan card buat room & join room
    Buat room berhasil dan redirect ke /room/XXXXXX
    Join room via kode berhasil
    Halaman lobby menampilkan daftar pemain dan slot kosong
    Tombol "Mulai Game" aktif saat ≥2 pemain, disabled saat <2
    Tombol "Keluar/Tutup Room" berfungsi dan redirect ke dashboard
    InviteCard sudah dipindah ke components/game/invite-card.tsx -->

<!-- fase 5
    File hooks/use-realtime.ts sudah ada
    lobby-client.tsx sudah diupdate dengan realtime
    room/[code]/page.tsx sudah kirim initialPlayers dan hostId ke LobbyClient
    API route app/api/room/[code]/start/route.ts sudah ada
    invite-listener.tsx sudah ada di components/game/
    Dashboard sudah pakai InviteListener bukan card statis
    Tabel realtime sudah aktif di Supabase
    Test realtime: pemain join → langsung muncul tanpa refresh
    Test mulai game: semua client redirect ke /play/[code] -->

<!-- fase 6
    lib/game-engine.ts sudah ada
    app/api/room/[code]/roll/route.ts sudah ada
    app/api/room/[code]/leave/route.ts sudah ada
    components/game/board.tsx sudah ada — papan tampil 10x10
    components/game/dice.tsx sudah ada — dadu visual
    components/game/player-info.tsx sudah ada
    app/(game)/play/[code]/page.tsx sudah ada
    app/(game)/play/[code]/game-client.tsx sudah ada
    app/(game)/play/[code]/result/page.tsx sudah ada
    Roll dadu berhasil menggerakkan pion di papan
    Pergerakan pion sync realtime ke browser lain
    Ular dan tangga berfungsi
    Game selesai redirect ke halaman result -->

<!--    pw dtbs
        DevGlan
        desk admin123
        scrt key admin123
        FpPYbx6/rx3ZolDIIoKAsQ== 
-->