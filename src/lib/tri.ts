import type { Collection, Tenue } from "./types";

export type Tri = "recentes" | "anciennes" | "nom";

export const TRIS: { valeur: Tri; libelle: string }[] = [
  { valeur: "recentes", libelle: "Plus récentes" },
  { valeur: "anciennes", libelle: "Plus anciennes" },
  { valeur: "nom", libelle: "Par nom" },
];

const date = (t: Tenue) => t.publiee_le ?? t.cree_le;

export function trierTenues(tenues: Tenue[], tri: Tri): Tenue[] {
  const copie = [...tenues];
  if (tri === "nom") copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" }));
  else if (tri === "anciennes") copie.sort((a, b) => date(a).localeCompare(date(b)));
  else copie.sort((a, b) => date(b).localeCompare(date(a)));
  return copie;
}

/** Ordre choisi par la créatrice à l'intérieur d'une collection. */
export function ordreCollection(tenues: Tenue[]): Tenue[] {
  return [...tenues].sort((a, b) => a.ordre - b.ordre || date(a).localeCompare(date(b)));
}

export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/** Recherche sur le nom, les détails et le champ « créée pour ». */
export function correspond(tenue: Tenue, recherche: string): boolean {
  const q = normaliser(recherche.trim());
  if (!q) return true;
  return [tenue.nom, tenue.details, tenue.creee_pour].some((champ) => normaliser(champ ?? "").includes(q));
}

export function indexCollections(collections: Collection[]): Map<string, Collection> {
  return new Map(collections.map((c) => [c.id, c]));
}
