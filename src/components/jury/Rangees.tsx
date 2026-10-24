"use client";

import { useDroppable } from "@dnd-kit/core";
import { rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImageTenue } from "@/components/Portrait";
import { couleurCss } from "@/lib/tierlist";
import type { Rang, Tenue } from "@/lib/types";

export const RESERVE = "reserve";
export const idZone = (conteneur: string) => `zone:${conteneur}`;
export const idRang = (rang: string) => `rang:${rang}`;

/** Texte clair ou sombre selon la couleur libre choisie pour le rang. */
function couleurTexte(couleur: string): string | undefined {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(couleur);
  if (!hex) return undefined;
  const [r, g, b] = hex.slice(1).map((h) => parseInt(h, 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.55 ? "var(--rang-texte-sur-clair)" : undefined;
}

export function styleEtiquette(couleur: string): React.CSSProperties {
  return { background: couleurCss(couleur), color: couleurTexte(couleur) };
}

interface PropsVignette {
  tenue: Tenue;
  editable: boolean;
  onOuvrir: (tenue: Tenue) => void;
}

export function VignetteTier({ tenue, editable, onOuvrir }: PropsVignette) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tenue.id,
    data: { type: "tenue" },
    disabled: !editable,
  });
  return (
    <li
      ref={setNodeRef}
      className={`vignette-tier ${isDragging ? "vignette-tier--fantome" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        type="button"
        className="vignette-tier__bouton"
        {...(editable ? { ...attributes, ...listeners } : {})}
        aria-label={editable ? `${tenue.nom}. Espace pour déplacer, Entrée pour voir en grand.` : `${tenue.nom}, voir en grand`}
        onClick={() => onOuvrir(tenue)}
      >
        <ImageTenue tenue={tenue} format="vignette" />
        <span className="vignette-tier__nom">{tenue.nom}</span>
      </button>
    </li>
  );
}

export function VignetteSurvol({ tenue }: { tenue: Tenue }) {
  return (
    <div className="vignette-tier vignette-tier--survol">
      <span className="vignette-tier__bouton">
        <ImageTenue tenue={tenue} format="vignette" />
        <span className="vignette-tier__nom">{tenue.nom}</span>
      </span>
    </div>
  );
}

function Zone({
  conteneur,
  tenues,
  editable,
  onOuvrir,
  className,
  vide,
}: {
  conteneur: string;
  tenues: Tenue[];
  editable: boolean;
  onOuvrir: (t: Tenue) => void;
  className: string;
  vide?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: idZone(conteneur), disabled: !editable });
  return (
    <SortableContext id={conteneur} items={tenues.map((t) => t.id)} strategy={rectSortingStrategy}>
      <ul ref={setNodeRef} className={`${className} ${isOver ? "zone--survolee" : ""}`}>
        {tenues.map((t) => (
          <VignetteTier key={t.id} tenue={t} editable={editable} onOuvrir={onOuvrir} />
        ))}
        {tenues.length === 0 && vide && <li className="zone__vide legende">{vide}</li>}
      </ul>
    </SortableContext>
  );
}

interface PropsRang {
  rang: Rang;
  tenues: Tenue[];
  editable: boolean;
  onOuvrir: (t: Tenue) => void;
  onReglages: (rang: Rang) => void;
}

export function RangeeTier({ rang, tenues, editable, onOuvrir, onReglages }: PropsRang) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: idRang(rang.id),
    data: { type: "rang" },
    disabled: !editable,
  });
  return (
    <li
      ref={setNodeRef}
      className={`rang ${isDragging ? "rang--fantome" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <div className="rang__etiquette" style={styleEtiquette(rang.couleur)}>
        {editable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="rang__poignee"
            {...attributes}
            {...listeners}
            aria-label={`Déplacer le rang ${rang.nom}`}
          >
            <span aria-hidden>⋮⋮</span>
          </button>
        )}
        {editable ? (
          <button type="button" className="rang__nom" onClick={() => onReglages(rang)} title="Régler ce rang">
            {rang.nom || " "}
          </button>
        ) : (
          <span className="rang__nom">{rang.nom}</span>
        )}
      </div>
      <Zone conteneur={rang.id} tenues={tenues} editable={editable} onOuvrir={onOuvrir} className="rang__tenues" />
    </li>
  );
}

export function Reserve({
  tenues,
  editable,
  onOuvrir,
}: {
  tenues: Tenue[];
  editable: boolean;
  onOuvrir: (t: Tenue) => void;
}) {
  return (
    <Zone
      conteneur={RESERVE}
      tenues={tenues}
      editable={editable}
      onOuvrir={onOuvrir}
      className="reserve__tenues"
      vide="Toutes les tenues sont classées."
    />
  );
}
