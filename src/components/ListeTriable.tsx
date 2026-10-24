"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props<T extends { id: string }> {
  elements: T[];
  onReordonner: (elements: T[]) => void;
  libelle: (element: T) => string;
  rendu: (element: T, poignee: React.ReactNode) => React.ReactNode;
  className?: string;
}

/** Liste réordonnable à la souris et au clavier (poignée + Espace + flèches). */
export function ListeTriable<T extends { id: string }>({ elements, onReordonner, libelle, rendu, className = "" }: Props<T>) {
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nom = (id: string | number) => {
    const e = elements.find((x) => x.id === id);
    return e ? libelle(e) : "";
  };

  const fin = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const de = elements.findIndex((e) => e.id === active.id);
    const vers = elements.findIndex((e) => e.id === over.id);
    if (de >= 0 && vers >= 0) onReordonner(arrayMove(elements, de, vers));
  };

  return (
    <DndContext
      sensors={capteurs}
      collisionDetection={closestCenter}
      onDragEnd={fin}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `${nom(active.id)} est saisi.`,
          onDragOver: ({ active, over }) => (over ? `${nom(active.id)} passe à la place de ${nom(over.id)}.` : undefined),
          onDragEnd: ({ active }) => `${nom(active.id)} est déposé.`,
          onDragCancel: ({ active }) => `Déplacement de ${nom(active.id)} annulé.`,
        },
        screenReaderInstructions: {
          draggable: "Appuyez sur Espace pour saisir, utilisez les flèches pour déplacer, puis Espace pour déposer.",
        },
      }}
    >
      <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
        <ol className={`liste-triable ${className}`}>
          {elements.map((e) => (
            <Element key={e.id} id={e.id} libelle={libelle(e)}>
              {(poignee) => rendu(e, poignee)}
            </Element>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function Element({
  id,
  libelle,
  children,
}: {
  id: string;
  libelle: string;
  children: (poignee: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const poignee = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      className="poignee"
      {...attributes}
      {...listeners}
      aria-label={`Déplacer ${libelle}`}
    >
      <span aria-hidden>⋮⋮</span>
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      className={`liste-triable__element ${isDragging ? "liste-triable__element--glisse" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      {children(poignee)}
    </li>
  );
}
