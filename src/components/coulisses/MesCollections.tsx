"use client";

import { useState } from "react";
import { Confirmation } from "@/components/Dialogue";
import { ListeTriable } from "@/components/ListeTriable";
import { ErreurAtelier, revalider } from "@/lib/atelier";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Collection } from "@/lib/types";
import type { Atelier } from "./Coulisses";
import { creerCollection, enregistrerOrdre, messageErreur } from "./operations";

export function MesCollections({ atelier }: { atelier: Atelier }) {
  const { collections, tenues, setCollections } = atelier;
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState("");
  const [aSupprimer, setASupprimer] = useState<Collection | null>(null);
  const [occupe, setOccupe] = useState(false);

  const compte = (id: string) => tenues.filter((t) => t.collection_id === id).length;

  const ajouter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) return;
    setOccupe(true);
    setErreur("");
    try {
      const c = await creerCollection(titre, description, collections);
      setCollections((cs) => [...cs, c]);
      setTitre("");
      setDescription("");
      await revalider();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  const enregistrer = async (c: Collection, modifs: Partial<Pick<Collection, "titre" | "description">>) => {
    if (modifs.titre !== undefined && !modifs.titre.trim()) return;
    setErreur("");
    // Le slug est conservé si le titre change : les liens partagés restent valides.
    const { data, error } = await supabaseNavigateur().from("collections").update(modifs).eq("id", c.id).select("*").single();
    if (error || !data) {
      setErreur("La collection n'a pas pu être enregistrée.");
      return;
    }
    setCollections((cs) => cs.map((x) => (x.id === c.id ? (data as Collection) : x)));
    await revalider();
  };

  const reordonner = async (liste: Collection[]) => {
    setCollections(liste.map((c, ordre) => ({ ...c, ordre })));
    try {
      await enregistrerOrdre("collections", liste.map((c) => c.id));
    } catch (err) {
      setErreur(messageErreur(err));
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setOccupe(true);
    try {
      const { error } = await supabaseNavigateur().from("collections").delete().eq("id", aSupprimer.id);
      if (error) throw new ErreurAtelier("Cette collection contient encore des tenues : déplacez-les d'abord.");
      setCollections((cs) => cs.filter((c) => c.id !== aSupprimer.id));
      setASupprimer(null);
      await revalider();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <section className="section-coulisses">
      <h2 className="titre-2">Mes collections</h2>
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}

      {collections.length > 0 && (
        <ListeTriable
          elements={collections}
          libelle={(c) => c.titre}
          onReordonner={(l) => void reordonner(l)}
          rendu={(c, poignee) => {
            const n = compte(c.id);
            return (
              <div className="ligne-collection">
                {poignee}
                <div className="ligne-collection__champs">
                  <label className="champ champ--compact">
                    <span className="visuellement-cache">Titre de la collection</span>
                    <input
                      defaultValue={c.titre}
                      maxLength={80}
                      onBlur={(e) => e.target.value.trim() !== c.titre && void enregistrer(c, { titre: e.target.value.trim() })}
                    />
                  </label>
                  <label className="champ champ--compact">
                    <span className="visuellement-cache">Description de la collection</span>
                    <textarea
                      rows={2}
                      defaultValue={c.description}
                      maxLength={600}
                      placeholder="Quelques mots pour présenter la collection…"
                      onBlur={(e) => e.target.value.trim() !== c.description && void enregistrer(c, { description: e.target.value.trim() })}
                    />
                  </label>
                </div>
                <div className="ligne-collection__infos">
                  <span className="legende">
                    {n} {n > 1 ? "tenues" : "tenue"}
                  </span>
                  <button
                    type="button"
                    className="bouton bouton--petit bouton--danger-discret"
                    disabled={n > 0}
                    title={n > 0 ? "Déplacez d'abord ses tenues vers une autre collection." : undefined}
                    onClick={() => setASupprimer(c)}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            );
          }}
        />
      )}

      <form className="formulaire formulaire--encadre" onSubmit={ajouter}>
        <h3 className="titre-3">Ouvrir une nouvelle collection</h3>
        <label className="champ">
          <span>Titre</span>
          <input value={titre} onChange={(e) => setTitre(e.target.value)} required maxLength={80} />
        </label>
        <label className="champ">
          <span>Description</span>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={600} />
        </label>
        <div className="formulaire__actions">
          <button type="submit" className="bouton bouton--principal" disabled={occupe || !titre.trim()}>
            Créer la collection
          </button>
        </div>
      </form>

      <Confirmation
        ouvert={Boolean(aSupprimer)}
        titre="Supprimer cette collection ?"
        message={<p>La collection « {aSupprimer?.titre} » est vide et sera supprimée.</p>}
        action="Supprimer"
        occupe={occupe}
        onConfirmer={() => void supprimer()}
        onAnnuler={() => setASupprimer(null)}
      />
    </section>
  );
}
