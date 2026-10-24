import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigure } from "./config";

let client: SupabaseClient | null = null;

/** Client anonyme sans cookies : sert à pré-générer les pages publiques. */
export function supabasePublic(): SupabaseClient | null {
  if (!supabaseConfigure) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
