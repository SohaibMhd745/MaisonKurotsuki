"use client";

import { useState } from "react";
import { revalider } from "@/lib/atelier";
import { blobSkin, imageSkin } from "@/lib/skins";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Tenue } from "@/lib/types";
import type { Atelier } from "./Coulisses";
import { messageErreur, regenererImages } from "./operations";

export function Sauvegarde({ atelier }: { atelier: Atelier }) {
  const { tenues, setTenues, photographier, montrer } = atelier;
  const [archive, setArchive] = useState<{ fait: number; total: number } | null>(null);
  const [regeneration, setRegeneration] = useState<{ fait: number; total: number; echecs: string[] } | null>(null);
  const [erreur, setErreur] = useState("");

  const telecharger = async () => {
    setErreur("");
    setArchive({ fait: 0, total: tenues.length });
    try {
      const sb = supabaseNavigateur();
      const [{ default: JSZip }, collections, tierLists, toutes] = await Promise.all([
        import("jszip"),
        sb.from("collections").select("*").order("ordre"),
        sb.from("tier_lists").select("*").order("cree_le"),
        sb.from("tenues").select("*").order("cree_le"),
      ]);
      const liste = (toutes.data as Tenue[] | null) ?? tenues;
      const zip = new JSZip();
      const dossier = zip.folder("skins")!;
      let fait = 0;
      const manquants: string[] = [];
      for (const t of liste) {
        try {
          dossier.file(`${t.slug}.png`, await blobSkin(t.skin_path));
        } catch {
          manquants.push(t.nom);
        }
        setArchive({ fait: ++fait, total: liste.length });
      }
      zip.file(
        "donnees.json",
        JSON.stringify(
          {
            maison: "Maison Kurotsuki",
            exportee_le: new Date().toISOString(),
            tenues: liste.map((t) => ({ ...t, fichier: `skins/${t.slug}.png` })),
            collections: collections.data ?? [],
            tier_lists: tierLists.data ?? [],
          },
          null,
          2,
        ),
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const lien = document.createElement("a");
      lien.href = URL.createObjectURL(blob);
      lien.download = `maison-kurotsuki-${new Date().toISOString().slice(0, 10)}.zip`;
      lien.click();
      setTimeout(() => URL.revokeObjectURL(lien.href), 10_000);
      if (manquants.length) setErreur(`Fichiers introuvables : ${manquants.join(", ")}.`);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setArchive(null);
    }
  };

  const regenererTout = async () => {
    setErreur("");
    const echecs: string[] = [];
    setRegeneration({ fait: 0, total: tenues.length, echecs });
    let fait = 0;
    for (const t of tenues) {
      try {
        const image = await imageSkin(t.skin_path);
        montrer(image, t.gabarit, t.nom);
        const maj = await regenererImages(t, image, t.gabarit, photographier, {}, true);
        setTenues((ts) => ts.map((x) => (x.id === maj.id ? maj : x)));
      } catch (e) {
        echecs.push(`${t.nom} (${messageErreur(e)})`);
      }
      setRegeneration({ fait: ++fait, total: tenues.length, echecs });
    }
    await revalider();
    setRegeneration(null);
    if (echecs.length) setErreur(`Images non regénérées : ${echecs.join(" ; ")}`);
  };

  return (
    <section className="section-coulisses">
      <h2 className="titre-2">Sauvegarde</h2>

      <div className="bloc">
        <h3 className="titre-3">Télécharger une sauvegarde</h3>
        <p className="texte-doux">
          Une archive avec tous les skins PNG et un fichier de données (tenues, collections, tier lists).
        </p>
        <button type="button" className="bouton bouton--principal" onClick={() => void telecharger()} disabled={Boolean(archive || regeneration)}>
          {archive ? `Préparation… ${archive.fait} / ${archive.total}` : "Télécharger l'archive"}
        </button>
      </div>

      <div className="bloc">
        <h3 className="titre-3">Regénérer toutes les images</h3>
        <p className="texte-doux">
          Reprend le portrait et la vignette de chaque tenue avec le cadrage actuel. Utile si le cadrage a été ajusté.
        </p>
        <button type="button" className="bouton" onClick={() => void regenererTout()} disabled={Boolean(archive || regeneration) || tenues.length === 0}>
          {regeneration ? `Prise de vue… ${regeneration.fait} / ${regeneration.total}` : "Regénérer toutes les images"}
        </button>
        {regeneration && (
          <progress className="progression" max={regeneration.total} value={regeneration.fait}>
            {regeneration.fait} / {regeneration.total}
          </progress>
        )}
      </div>

      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
    </section>
  );
}
