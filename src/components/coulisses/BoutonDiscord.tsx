"use client";

import { useState } from "react";
import { supabaseConfigure } from "@/lib/supabase/config";
import { supabaseNavigateur } from "@/lib/supabase/client";

export function BoutonDiscord() {
  const [occupe, setOccupe] = useState(false);

  const connecter = async () => {
    setOccupe(true);
    const { error } = await supabaseNavigateur().auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setOccupe(false);
  };

  return (
    <button
      type="button"
      className="bouton bouton--principal bouton--large"
      onClick={connecter}
      disabled={occupe || !supabaseConfigure}
    >
      {occupe ? "Ouverture de Discord…" : "Se connecter avec Discord"}
    </button>
  );
}
