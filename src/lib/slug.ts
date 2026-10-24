/** « Rosée noire » → « rosee-noire ». */
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sans-nom";
}

/** Ajoute -2, -3… si le slug est déjà pris. */
export function slugUnique(texte: string, pris: Iterable<string>): string {
  const existants = new Set(pris);
  const base = slugifier(texte);
  if (!existants.has(base)) return base;
  let n = 2;
  while (existants.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
