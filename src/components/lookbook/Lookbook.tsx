"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageTenue } from "@/components/Portrait";
import { VueSkin, type VueSkinRef } from "@/components/VueSkin";
import { MAISON } from "@/lib/maison";
import { imageSkin, prechargerSkins } from "@/lib/skins";
import { indexCollections, ordreCollection } from "@/lib/tri";
import type { Collection, Tenue } from "@/lib/types";

const INTERVALLE_DEFILE = 4000;

interface Props {
  tenues: Tenue[];
  collections: Collection[];
  slug: string;
  statique?: boolean;
}

export function Lookbook(props: Props) {
  if (props.statique) return <Scene {...props} collectionSlug={null} />;
  return <AvecAdresse {...props} />;
}

function AvecAdresse(props: Props) {
  const parametres = useSearchParams();
  return <Scene {...props} collectionSlug={parametres?.get("collection") ?? null} />;
}

function Scene({ tenues, collections, slug, collectionSlug, statique }: Props & { collectionSlug: string | null }) {
  const racine = useRef<HTMLDivElement>(null);
  const vue = useRef<VueSkinRef>(null);
  const bande = useRef<HTMLOListElement>(null);
  const parId = useMemo(() => indexCollections(collections), [collections]);

  // La navigation suit le filtre d'origine : une collection, ou toutes les tenues.
  const collection = collections.find((c) => c.slug === collectionSlug) ?? null;
  const selection = useMemo(() => {
    if (!collection) return tenues;
    const dedans = ordreCollection(tenues.filter((t) => t.collection_id === collection.id));
    return dedans.some((t) => t.slug === slug) ? dedans : tenues;
  }, [tenues, collection, slug]);
  const filtreActif = collection && selection !== tenues ? collection : null;

  const [index, setIndex] = useState(() => Math.max(0, selection.findIndex((t) => t.slug === slug)));
  const [defile, setDefile] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  const [chargement, setChargement] = useState(true);
  const tenue = selection[index] ?? selection[0];
  const demande = useRef(0);

  useEffect(() => {
    setIndex(Math.max(0, selection.findIndex((t) => t.slug === slug)));
  }, [selection, slug]);

  // Charge la tenue courante dans la vue et précharge ses voisines.
  useEffect(() => {
    if (!tenue || statique) return;
    const numero = ++demande.current;
    setChargement(true);
    imageSkin(tenue.skin_path)
      .then((image) => {
        if (numero !== demande.current) return;
        vue.current?.charger(image, tenue.gabarit);
        setChargement(false);
      })
      .catch(() => {
        if (numero === demande.current) setChargement(false);
      });
    const n = selection.length;
    const voisins = [1, -1, 2, -2].map((d) => selection[(index + d + n) % n]?.skin_path).filter(Boolean);
    prechargerSkins(voisins);
  }, [tenue, index, selection, statique]);

  // Adresse propre à chaque tenue, mise à jour à chaque changement.
  useEffect(() => {
    if (!tenue || statique) return;
    const qs = filtreActif ? `?collection=${filtreActif.slug}` : "";
    const adresse = `/lookbook/${tenue.slug}${qs}`;
    if (window.location.pathname + window.location.search !== adresse) {
      window.history.replaceState(null, "", adresse);
    }
    document.title = `${tenue.nom} · ${MAISON.nom}`;
    bande.current
      ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [tenue, index, filtreActif, statique]);

  const aller = useCallback(
    (delta: number) => setIndex((i) => (i + delta + selection.length) % selection.length),
    [selection.length],
  );
  const interaction = useCallback(() => setDefile(false), []);

  // Défilé automatique : toutes les 4 secondes ; toute interaction le met en pause.
  useEffect(() => {
    if (!defile || selection.length < 2) return;
    const minuterie = window.setInterval(() => aller(1), INTERVALLE_DEFILE);
    return () => window.clearInterval(minuterie);
  }, [defile, aller, selection.length]);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (cible.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        interaction();
        aller(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [aller, interaction]);

  useEffect(() => {
    const suivre = () => setPleinEcran(document.fullscreenElement === racine.current);
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  const basculerPleinEcran = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void racine.current?.requestFullscreen?.().catch(() => {});
  };

  // Glissement au doigt.
  const depart = useRef<{ x: number; y: number; t: number } | null>(null);
  const toucherDebut = (e: React.PointerEvent) => {
    if (e.pointerType === "touch") depart.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
  };
  const toucherFin = (e: React.PointerEvent) => {
    const d = depart.current;
    depart.current = null;
    if (!d || e.pointerType !== "touch") return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(e.clientY - d.y) * 1.5 && e.timeStamp - d.t < 500) {
      interaction();
      aller(dx < 0 ? 1 : -1);
    }
  };

  if (!tenue) return null;
  const nomCollection = parId.get(tenue.collection_id)?.titre;
  const precedente = () => {
    interaction();
    aller(-1);
  };
  const suivante = () => {
    interaction();
    aller(1);
  };

  return (
    <div
      ref={racine}
      className={`lookbook ${pleinEcran ? "lookbook--plein-ecran" : ""}`}
      onPointerDown={toucherDebut}
      onPointerUp={toucherFin}
    >
      <div className="lookbook__scene">
        <div className="lookbook__projecteur" aria-hidden />
        <div className="lookbook__sol" aria-hidden />
        {statique ? (
          <div className="vue-skin vue-skin--repli">
            <ImageTenue tenue={tenue} prioritaire />
          </div>
        ) : (
          <VueSkin
            ref={vue}
            className="lookbook__vue"
            libelle={`${tenue.nom}, vue en trois dimensions. Faites glisser pour la faire tourner.`}
            repli={<ImageTenue tenue={tenue} prioritaire />}
            onInteraction={interaction}
          />
        )}
        {chargement && !statique && <span className="lookbook__chargement" aria-hidden />}

        <button
          type="button"
          className="lookbook__fleche lookbook__fleche--prec"
          onClick={precedente}
          aria-label="Tenue précédente"
          disabled={selection.length < 2}
        >
          <span aria-hidden>‹</span>
        </button>
        <button
          type="button"
          className="lookbook__fleche lookbook__fleche--suiv"
          onClick={suivante}
          aria-label="Tenue suivante"
          disabled={selection.length < 2}
        >
          <span aria-hidden>›</span>
        </button>

        <p className="lookbook__nom-plein-ecran titre-2" aria-hidden>
          {tenue.nom}
        </p>
      </div>

      <aside className="lookbook__panneau" aria-live="polite">
        <p className="legende">
          Look {index + 1} sur {selection.length}
          {filtreActif && <> · {filtreActif.titre}</>}
        </p>
        <h1 key={tenue.id} className="titre-1 lookbook__nom">
          {tenue.nom}
        </h1>
        {nomCollection && <p className="sous-titre lookbook__collection">{nomCollection}</p>}
        <div className="lookbook__details">
          {tenue.details && <p>{tenue.details}</p>}
          {tenue.creee_pour && <p className="legende">Créée pour {tenue.creee_pour}</p>}
        </div>
        <div className="lookbook__commandes">
          <label className="interrupteur">
            <input
              type="checkbox"
              role="switch"
              checked={defile}
              onChange={(e) => setDefile(e.target.checked)}
              disabled={selection.length < 2}
            />
            <span className="interrupteur__piste" aria-hidden />
            <span>Défilé automatique</span>
          </label>
          <button type="button" className="bouton bouton--discret" onClick={basculerPleinEcran}>
            {pleinEcran ? "Quitter le plein écran" : "Plein écran"}
          </button>
          <Link
            href={filtreActif ? `/garde-robe?collection=${filtreActif.slug}` : "/garde-robe"}
            className="bouton bouton--discret"
          >
            Retour à la garde-robe
          </Link>
        </div>
      </aside>

      <nav className="lookbook__bande" aria-label="Toutes les tenues de la sélection">
        <ol ref={bande}>
          {selection.map((t, i) => (
            <li key={t.id} data-index={i}>
              <button
                type="button"
                className="lookbook__vignette"
                aria-current={i === index ? "true" : undefined}
                aria-label={`${t.nom} (look ${i + 1})`}
                onClick={() => {
                  interaction();
                  setIndex(i);
                }}
              >
                <ImageTenue tenue={t} format="vignette" />
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
