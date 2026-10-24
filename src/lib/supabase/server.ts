import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Role } from "../types";

/** Client serveur lié à la session de la requête (Coulisses, routes API). */
export async function supabaseServeur() {
  const magasin = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => magasin.getAll(),
      setAll: (aPoser) => {
        try {
          aPoser.forEach(({ name, value, options }) => magasin.set(name, value, options));
        } catch {
          // Appelé depuis un composant serveur : le proxy rafraîchit la session.
        }
      },
    },
  });
}

/** Rôle du compte connecté, vérifié par la base. */
export async function roleCourant(): Promise<{ role: Role | null; userId: string | null }> {
  const supabase = await supabaseServeur();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: null, userId: null };
  const { data } = await supabase.rpc("role_membre");
  return { role: (data as Role | null) ?? null, userId: user.id };
}
