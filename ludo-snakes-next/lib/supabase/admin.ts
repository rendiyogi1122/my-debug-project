import { createClient } from "@supabase/supabase-js";

// Admin client menggunakan SERVICE_ROLE_KEY — bypass RLS sepenuhnya.
// Hanya digunakan di server-side routes untuk operasi write pada tabel rooms.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tidak ditemukan di environment variables"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
