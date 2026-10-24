import { SUPABASE_URL } from "./supabase/config";
import type { Tenue } from "./types";

/** Adresse publique d'un rendu (portrait ou vignette). */
export function urlRendu(chemin: string | null | undefined): string | null {
  if (!chemin || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/renders/${chemin
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export const urlPortrait = (t: Pick<Tenue, "portrait_path">) => urlRendu(t.portrait_path);
export const urlVignette = (t: Pick<Tenue, "vignette_path" | "portrait_path">) =>
  urlRendu(t.vignette_path ?? t.portrait_path);
