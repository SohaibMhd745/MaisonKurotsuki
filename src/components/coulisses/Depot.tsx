"use client";

import { useRef, useState } from "react";
import type { Gabarit } from "@/lib/types";
import type { ResultatVerifications } from "@/lib/verifications";

/** Dépôt d'un fichier PNG : glisser-déposer ou bouton. */
export function DepotSkin({ onFichier, compact = false }: { onFichier: (f: File) => void; compact?: boolean }) {
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);

  return (
    <div
      className={`depot ${survol ? "depot--survol" : ""} ${compact ? "depot--compact" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setSurvol(true);
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault();
        setSurvol(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFichier(f);
      }}
    >
      <p className={compact ? "texte-doux" : "sous-titre"}>Déposez ici le fichier PNG du skin</p>
      <p className="legende">ou</p>
      <button type="button" className="bouton" onClick={() => champ.current?.click()}>
        Choisir un fichier
      </button>
      <input
        ref={champ}
        type="file"
        accept="image/png,.png"
        className="visuellement-cache"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFichier(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ListeVerifications({ resultat }: { resultat: ResultatVerifications }) {
  return (
    <ul className="verifications" aria-label="Vérifications du fichier">
      {resultat.verifications.map((v) => (
        <li key={v.id} className={`verification verification--${v.ok ? "ok" : "refus"}`}>
          <span className="verification__marque" aria-hidden>
            {v.ok ? "✓" : "✕"}
          </span>
          <span>{v.message}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChoixGabarit({
  valeur,
  detecte,
  onChange,
}: {
  valeur: Gabarit;
  detecte?: Gabarit;
  onChange: (g: Gabarit) => void;
}) {
  return (
    <fieldset className="champ-groupe">
      <legend>Gabarit</legend>
      <div className="segmente">
        {(["classic", "slim"] as const).map((g) => (
          <label key={g} className="segmente__option">
            <input type="radio" name="gabarit" checked={valeur === g} onChange={() => onChange(g)} />
            <span>{g === "classic" ? "Classique (bras larges)" : "Slim (bras fins)"}</span>
          </label>
        ))}
      </div>
      {detecte && (
        <p className="legende">
          Détecté automatiquement : {detecte === "classic" ? "classique" : "slim"}.
          {valeur !== detecte && " Corrigé à la main."}
        </p>
      )}
    </fieldset>
  );
}
