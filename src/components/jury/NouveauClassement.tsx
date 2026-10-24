"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialogue } from "@/components/Dialogue";
import { useMembre } from "@/hooks/useMembre";
import { revalider } from "@/lib/atelier";
import { supabaseNavigateur } from "@/lib/supabase/client";
import { modeleSABCD } from "@/lib/tierlist";
import type { Collection } from "@/lib/types";
import { ChoixCollections } from "./ChoixCollections";

/** Bouton « Nouveau classement », visible des seuls membres. */
export function NouveauClassement({ collections }: { collections: Collection[] }) {
  const { role } = useMembre();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [choix, setChoix] = useState<string[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!role) return null;

  const creer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setOccupe(true);
    setErreur("");
    const { data, error } = await supabaseNavigateur()
      .from("tier_lists")
      .insert({ titre: titre.trim(), collections: choix, contenu: modeleSABCD() })
      .select("id")
      .single();
    if (error || !data) {
      setErreur("Le classement n'a pas pu être créé.");
      setOccupe(false);
      return;
    }
    void revalider();
    router.push(`/jury/${data.id}`);
  };

  return (
    <>
      <button type="button" className="bouton bouton--principal" onClick={() => setOuvert(true)}>
        Nouveau classement
      </button>
      <Dialogue ouvert={ouvert} onFermer={() => setOuvert(false)} titre="Nouveau classement">
        <form className="formulaire" onSubmit={creer}>
          <label className="champ">
            <span>Titre</span>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} required autoFocus maxLength={120} />
          </label>
          <ChoixCollections collections={collections} valeur={choix} onChange={setChoix} />
          <p className="legende">Le classement commence avec les rangs S, A, B, C et D.</p>
          {erreur && <p className="message message--erreur">{erreur}</p>}
          <div className="dialogue__actions">
            <button type="button" className="bouton bouton--discret" onClick={() => setOuvert(false)}>
              Annuler
            </button>
            <button type="submit" className="bouton bouton--principal" disabled={occupe || !titre.trim()}>
              Créer le classement
            </button>
          </div>
        </form>
      </Dialogue>
    </>
  );
}
