"use client";

import { forwardRef } from "react";
import { ImageTenue } from "@/components/Portrait";
import { dateLongue } from "@/lib/dates";
import { MAISON } from "@/lib/maison";
import type { Rang, Tenue } from "@/lib/types";
import { styleEtiquette } from "./Rangees";

/**
 * Mise en page dédiée à l'export PNG : titre, rangs et vignettes statiques
 * (jamais de capture 3D), sans la réserve, avec le nom de la Maison et la date.
 */
export const ExportTierList = forwardRef<
  HTMLDivElement,
  { titre: string; rangs: Rang[]; parId: Map<string, Tenue> }
>(function ExportTierList({ titre, rangs, parId }, ref) {
  return (
    <div className="export-tier" aria-hidden>
      <div ref={ref} className="export-tier__page">
        <header className="export-tier__entete">
          <h1 className="titre-1">{titre}</h1>
        </header>
        <ol className="export-tier__rangs">
          {rangs.map((r) => (
            <li key={r.id} className="rang">
              <div className="rang__etiquette" style={styleEtiquette(r.couleur)}>
                <span className="rang__nom">{r.nom}</span>
              </div>
              <ul className="rang__tenues">
                {r.tenues
                  .map((id) => parId.get(id))
                  .filter((t): t is Tenue => Boolean(t))
                  .map((t) => (
                    <li key={t.id} className="vignette-tier">
                      <span className="vignette-tier__bouton">
                        <ImageTenue tenue={t} format="vignette" prioritaire crossOrigin="anonymous" />
                        <span className="vignette-tier__nom">{t.nom}</span>
                      </span>
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>
        <footer className="export-tier__pied">
          <span className="marque">{MAISON.nom}</span>
          <span className="legende">{dateLongue(new Date())}</span>
        </footer>
      </div>
    </div>
  );
});
