"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ImageTenue } from "@/components/Portrait";
import { correspond, indexCollections, TRIS, trierTenues, type Tri } from "@/lib/tri";
import type { Collection, Tenue } from "@/lib/types";

interface Props {
  tenues: Tenue[];
  collections: Collection[];
  /** Rendu de repli (avant lecture de l'adresse) : aucun filtre. */
  statique?: boolean;
}

export function GardeRobe(props: Props) {
  if (props.statique) return <Contenu {...props} parametres={new URLSearchParams()} />;
  return <AvecAdresse {...props} />;
}

function AvecAdresse(props: Props) {
  const parametres = useSearchParams();
  return <Contenu {...props} parametres={new URLSearchParams(parametres?.toString())} />;
}

function Contenu({ tenues, collections, parametres }: Props & { parametres: URLSearchParams }) {
  const router = useRouter();
  const chemin = usePathname();
  const [, demarrer] = useTransition();

  const collectionSlug = parametres.get("collection") ?? "";
  const tri = (TRIS.some((t) => t.valeur === parametres.get("tri")) ? parametres.get("tri") : "recentes") as Tri;
  const [recherche, setRecherche] = useState(parametres.get("q") ?? "");

  const parId = useMemo(() => indexCollections(collections), [collections]);
  const collectionsAvecTenues = collections.filter((c) => tenues.some((t) => t.collection_id === c.id));
  const active = collections.find((c) => c.slug === collectionSlug) ?? null;

  const visibles = useMemo(() => {
    const filtrees = tenues.filter(
      (t) => (!active || t.collection_id === active.id) && correspond(t, recherche),
    );
    return trierTenues(filtrees, tri);
  }, [tenues, active, recherche, tri]);

  const majAdresse = (modifs: Record<string, string>) => {
    const p = new URLSearchParams(parametres);
    for (const [cle, valeur] of Object.entries(modifs)) {
      if (valeur && !(cle === "tri" && valeur === "recentes")) p.set(cle, valeur);
      else p.delete(cle);
    }
    const qs = p.toString();
    demarrer(() => router.replace(qs ? `${chemin}?${qs}` : chemin, { scroll: false }));
  };

  const suffixeLookbook = active ? `?collection=${active.slug}` : "";

  return (
    <>
      <div className="filtres" role="search">
        <div className="filtres__collections" role="group" aria-label="Filtrer par collection">
          <button
            type="button"
            className="filtre"
            aria-pressed={!active}
            onClick={() => majAdresse({ collection: "" })}
          >
            Toutes
          </button>
          {collectionsAvecTenues.map((c) => (
            <button
              key={c.id}
              type="button"
              className="filtre"
              aria-pressed={active?.id === c.id}
              onClick={() => majAdresse({ collection: active?.id === c.id ? "" : c.slug })}
            >
              {c.titre}
            </button>
          ))}
        </div>
        <div className="filtres__outils">
          <label className="champ champ--compact">
            <span className="visuellement-cache">Rechercher une tenue</span>
            <input
              type="search"
              placeholder="Rechercher une tenue…"
              value={recherche}
              onChange={(e) => {
                setRecherche(e.target.value);
                majAdresse({ q: e.target.value });
              }}
            />
          </label>
          <label className="champ champ--compact">
            <span className="visuellement-cache">Trier</span>
            <select value={tri} onChange={(e) => majAdresse({ tri: e.target.value })}>
              {TRIS.map((t) => (
                <option key={t.valeur} value={t.valeur}>
                  {t.libelle}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {active?.description && <p className="garde-robe__description texte-doux">{active.description}</p>}

      <p className="legende garde-robe__compte" aria-live="polite">
        {visibles.length} {visibles.length > 1 ? "tenues" : "tenue"}
      </p>

      {visibles.length === 0 ? (
        <p className="vide sous-titre">
          {tenues.length === 0 ? "La garde-robe attend sa première tenue." : "Aucune tenue ne correspond à cette recherche."}
        </p>
      ) : (
        <ul className="portraits">
          {visibles.map((t, i) => (
            <li key={t.id}>
              <Link href={`/lookbook/${t.slug}${suffixeLookbook}`} className="portrait">
                <span className="portrait__cadre">
                  <ImageTenue tenue={t} prioritaire={i < 8} />
                </span>
                <span className="portrait__nom">{t.nom}</span>
                <span className="legende">{parId.get(t.collection_id)?.titre}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
