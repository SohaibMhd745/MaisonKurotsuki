"use client";

import type { Collection } from "@/lib/types";

/** Tenues concernées : toutes, ou une ou plusieurs collections. */
export function ChoixCollections({
  collections,
  valeur,
  onChange,
}: {
  collections: Collection[];
  valeur: string[];
  onChange: (ids: string[]) => void;
}) {
  const toutes = valeur.length === 0;
  return (
    <fieldset className="champ-groupe">
      <legend>Tenues concernées</legend>
      <label className="case">
        <input type="radio" checked={toutes} onChange={() => onChange([])} />
        <span>Toutes les tenues</span>
      </label>
      <label className="case">
        <input
          type="radio"
          checked={!toutes}
          onChange={() => collections[0] && onChange([collections[0].id])}
          disabled={collections.length === 0}
        />
        <span>Seulement certaines collections</span>
      </label>
      {!toutes && (
        <div className="champ-groupe__sous">
          {collections.map((c) => (
            <label key={c.id} className="case">
              <input
                type="checkbox"
                checked={valeur.includes(c.id)}
                onChange={(e) => {
                  const suivant = e.target.checked ? [...valeur, c.id] : valeur.filter((id) => id !== c.id);
                  onChange(suivant.length ? suivant : valeur);
                }}
              />
              <span>{c.titre}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
