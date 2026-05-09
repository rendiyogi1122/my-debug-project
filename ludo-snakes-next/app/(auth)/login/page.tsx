import { signInWithGoogle } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #F8F7FF 0%, #FFF0F7 50%, #F0FDFB 100%)" }}>

      {/* Dekorasi lingkaran blur background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%",
          background:"rgba(124,111,247,0.08)", top:-80, left:-80 }} />
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%",
          background:"rgba(244,114,182,0.08)", bottom:100, right:-40 }} />
        <div style={{ position:"absolute", width:150, height:150, borderRadius:"50%",
          background:"rgba(45,212,191,0.08)", top:"40%", right:"10%" }} />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Hero */}
        <div className="text-center mb-6">
          <div className="animate-float inline-block text-7xl mb-4">🎲</div>
          <h1 className="text-3xl font-semibold mb-2" style={{ color:"var(--t1)" }}>
            Ludo Snakes
          </h1>
          <p className="text-sm leading-relaxed" style={{ color:"var(--t2)" }}>
            Ular tangga multiplayer yang seru<br />bersama teman-temanmu! 🐍🪜
          </p>
        </div>

        {/* Card login */}
        <div className="rounded-3xl border p-6 mb-5"
          style={{ background:"var(--card)", borderColor:"var(--border)",
            boxShadow:"0 8px 32px rgba(124,111,247,0.12)" }}>

          {error && (
            <div className="mb-4 rounded-2xl px-4 py-3 text-sm animate-fade-up"
              style={{ background:"#FFF0F0", border:"1.5px solid #FECACA", color:"#DC2626" }}>
              😅 Login gagal. Coba lagi ya!
            </div>
          )}

          <div className="text-center mb-5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
              style={{ background:"var(--pp-l)", color:"var(--pp)" }}>
              ✨ Masuk gratis, langsung main!
            </span>
          </div>

          <form action={signInWithGoogle}>
            <button type="submit"
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background:"#fff", borderColor:"var(--border)",
                boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
              <GoogleIcon />
              <span className="text-sm font-medium flex-1 text-left" style={{ color:"#374151" }}>
                Masuk dengan Google
              </span>
              <span style={{ color:"var(--pp)" }}>→</span>
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color:"var(--t3)" }}>
            Dengan masuk, kamu setuju bermain dengan sportif 🤝
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[["👥","2–4 Pemain"],["⚡","Realtime"],["🎯","Gratis"]].map(([icon, label]) => (
            <div key={label} className="rounded-2xl border p-3 text-center"
              style={{ background:"var(--card)", borderColor:"var(--border)" }}>
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs" style={{ color:"var(--t2)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" style={{ flexShrink:0 }}>
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
      <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
      <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
    </svg>
  );
}