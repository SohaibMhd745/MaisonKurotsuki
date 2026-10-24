"use client";

import { useEffect, useRef } from "react";

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  children: React.ReactNode;
  large?: boolean;
  className?: string;
}

/** Fenêtre modale native : piège du focus et touche Échap fournis par le navigateur. */
export function Dialogue({ ouvert, onFermer, titre, children, large, className = "" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  return (
    <dialog
      ref={ref}
      className={`dialogue ${large ? "dialogue--large" : ""} ${className}`}
      aria-label={titre}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === ref.current) onFermer();
      }}
    >
      {ouvert && (
        <div className="dialogue__corps">
          <header className="dialogue__entete">
            <h2 className="titre-3">{titre}</h2>
            <button type="button" className="bouton-icone" onClick={onFermer} aria-label="Fermer">
              <span aria-hidden>×</span>
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Confirmation({
  ouvert,
  titre,
  message,
  action,
  onConfirmer,
  onAnnuler,
  occupe,
}: {
  ouvert: boolean;
  titre: string;
  message: React.ReactNode;
  action: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
  occupe?: boolean;
}) {
  return (
    <Dialogue ouvert={ouvert} onFermer={onAnnuler} titre={titre}>
      <div className="dialogue__texte">{message}</div>
      <div className="dialogue__actions">
        <button type="button" className="bouton bouton--discret" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="button" className="bouton bouton--danger" onClick={onConfirmer} disabled={occupe}>
          {action}
        </button>
      </div>
    </Dialogue>
  );
}
