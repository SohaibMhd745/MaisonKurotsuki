import type { ContenuTierList, Rang, Tenue, TierList } from "./types";

/** Palette des rangs : les couleurs viennent des jetons --rang-1 … --rang-8. */
export const PALETTE_RANGS = Array.from({ length: 8 }, (_, i) => `palette:${i + 1}`);

export function couleurCss(couleur: string): string {
  const palette = /^palette:(\d+)$/.exec(couleur);
  if (palette) return `var(--rang-${palette[1]})`;
  return /^#[0-9a-f]{6}$/i.test(couleur) ? couleur : "var(--rang-7)";
}

export function nouvelId(): string {
  return crypto.randomUUID();
}

export function modeleSABCD(): ContenuTierList {
  return {
    rangs: ["S", "A", "B", "C", "D"].map((nom, i) => ({
      id: nouvelId(),
      nom,
      couleur: `palette:${i + 1}`,
      tenues: [],
    })),
  };
}

/** Tenues concernées par un classement : publiées, et dans ses collections (vide = toutes). */
export function tenuesConcernees(tl: Pick<TierList, "collections">, tenues: Tenue[]): Tenue[] {
  return tenues.filter(
    (t) => t.statut === "publiee" && (tl.collections.length === 0 || tl.collections.includes(t.collection_id)),
  );
}

/** Contenu reçu de la base, rendu sûr (format inattendu, doublons). */
export function contenuSur(brut: unknown): ContenuTierList {
  const rangs = (brut as ContenuTierList | null)?.rangs;
  if (!Array.isArray(rangs)) return { rangs: [] };
  const vues = new Set<string>();
  return {
    rangs: rangs
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        id: typeof r.id === "string" ? r.id : nouvelId(),
        nom: typeof r.nom === "string" ? r.nom : "",
        couleur: typeof r.couleur === "string" ? r.couleur : "palette:7",
        tenues: (Array.isArray(r.tenues) ? r.tenues : []).filter(
          (id): id is string => typeof id === "string" && !vues.has(id) && Boolean(vues.add(id)),
        ),
      })),
  };
}

/**
 * Sépare les tenues visibles de celles qui ne le sont plus (masquées,
 * hors des collections concernées) : ces dernières sont conservées à part
 * pour qu'un masquage temporaire n'efface pas un classement.
 */
export function separer(contenu: ContenuTierList, visibles: Set<string>) {
  const absentes = new Map<string, string[]>();
  const rangs: Rang[] = contenu.rangs.map((r) => {
    absentes.set(
      r.id,
      r.tenues.filter((id) => !visibles.has(id)),
    );
    return { ...r, tenues: r.tenues.filter((id) => visibles.has(id)) };
  });
  return { contenu: { rangs }, absentes };
}

export function reunir(contenu: ContenuTierList, absentes: Map<string, string[]>): ContenuTierList {
  return {
    rangs: contenu.rangs.map((r) => ({ ...r, tenues: [...r.tenues, ...(absentes.get(r.id) ?? [])] })),
  };
}

export function reserve(contenu: ContenuTierList, concernees: Tenue[]): Tenue[] {
  const placees = new Set(contenu.rangs.flatMap((r) => r.tenues));
  return concernees.filter((t) => !placees.has(t.id));
}
