"use client";

import { useEffect, useState } from "react";
import { Dialogue } from "@/components/Dialogue";
import { couleurCss, PALETTE_RANGS } from "@/lib/tierlist";
import type { Rang } from "@/lib/types";

interface Props {
  rang: Rang | null;
  seul: boolean;
  onFermer: () => void;
  onModifier: (id: string, modifs: Partial<Pick<Rang, "nom" | "couleur">>) => void;
  onAjouterApres: (id: string) => void;
  onSupprimer: (id: string) => void;
}

/** Réglages d'un rang : nom, couleur (palette ou libre), ajout et suppression. */
export function ReglagesRang({ rang, seul, onFermer, onModifier, onAjouterApres, onSupprimer }: Props) {
  const [nom, setNom] = useState(rang?.nom ?? "");
  useEffect(() => setNom(rang?.nom ?? ""), [rang?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rang) return <Dialogue ouvert={false} onFermer={onFermer} titre="Rang">{null}</Dialogue>;
  const couleurLibre = /^#[0-9a-f]{6}$/i.test(rang.couleur) ? rang.couleur : "#9b1b30";

  return (
    <Dialogue ouvert onFermer={onFermer} titre={`Rang ${rang.nom}`}>
      <div className="formulaire">
        <label className="champ">
          <span>Nom du rang</span>
          <input
            value={nom}
            maxLength={40}
            autoFocus
            onChange={(e) => {
              setNom(e.target.value);
              onModifier(rang.id, { nom: e.target.value });
            }}
            onKeyDown={(e) => e.key === "Enter" && onFermer()}
          />
        </label>
        <fieldset className="champ-groupe">
          <legend>Couleur</legend>
          <div className="nuancier">
            {PALETTE_RANGS.map((c, i) => (
              <button
                key={c}
                type="button"
                className="nuancier__pastille"
                style={{ background: couleurCss(c) }}
                aria-pressed={rang.couleur === c}
                aria-label={`Couleur ${i + 1} de la palette`}
                onClick={() => onModifier(rang.id, { couleur: c })}
              />
            ))}
            <label className="nuancier__libre" title="Couleur libre">
              <input
                type="color"
                value={couleurLibre}
                onChange={(e) => onModifier(rang.id, { couleur: e.target.value })}
                aria-label="Couleur libre"
              />
              <span className="legende">Libre</span>
            </label>
          </div>
        </fieldset>
        <div className="dialogue__actions dialogue__actions--reparties">
          <button
            type="button"
            className="bouton bouton--danger"
            disabled={seul}
            title={seul ? "Un classement garde au moins un rang." : undefined}
            onClick={() => {
              onSupprimer(rang.id);
              onFermer();
            }}
          >
            Supprimer le rang
          </button>
          <button
            type="button"
            className="bouton bouton--discret"
            onClick={() => {
              onAjouterApres(rang.id);
              onFermer();
            }}
          >
            Ajouter un rang en dessous
          </button>
          <button type="button" className="bouton bouton--principal" onClick={onFermer}>
            Terminé
          </button>
        </div>
        <p className="legende">Supprimer un rang renvoie ses tenues dans la réserve.</p>
      </div>
    </Dialogue>
  );
}
