"use client";

import { useEffect, useState } from "react";
import { supabaseConfigure } from "@/lib/supabase/config";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

/** Rôle du visiteur, vérifié par la base. Les pages publiques restent statiques. */
export function useMembre(): { role: Role | null; pret: boolean } {
  const [etat, setEtat] = useState<{ role: Role | null; pret: boolean }>({ role: null, pret: false });

  useEffect(() => {
    if (!supabaseConfigure) {
      setEtat({ role: null, pret: true });
      return;
    }
    const sb = supabaseNavigateur();
    let actif = true;
    const verifier = async () => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) {
        if (actif) setEtat({ role: null, pret: true });
        return;
      }
      const { data } = await sb.rpc("role_membre");
      if (actif) setEtat({ role: (data as Role | null) ?? null, pret: true });
    };
    void verifier();
    const { data: abonnement } = sb.auth.onAuthStateChange((evenement) => {
      if (evenement === "SIGNED_IN" || evenement === "SIGNED_OUT") void verifier();
    });
    return () => {
      actif = false;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  return etat;
}
