import { createClient } from "@/lib/supabase/server";

export default async function TestPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("count");

  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">Supabase connection test</h1>
      {error ? (
        <p className="text-red-400">Error: {error.message}</p>
      ) : (
        <p className="text-green-400">Koneksi berhasil!</p>
      )}
    </div>
  );
}