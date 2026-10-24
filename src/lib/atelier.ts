"use client";

import { supabaseNavigateur } from "./supabase/client";
import type { Photos } from "./skin3d";
import type { Tenue } from "./types";

/** Opérations d'écriture des membres (Coulisses, Jury). */

export class ErreurAtelier extends Error {}

/** Envoie le PNG au serveur, qui refait les vérifications avant de le ranger. */
export async function televerserSkin(fichier: File | Blob, tenueId: string): Promise<string> {
  const corps = new FormData();
  corps.append("fichier", fichier, "skin.png");
  corps.append("tenue", tenueId);
  const reponse = await fetch("/api/skins", { method: "POST", body: corps });
  const json = (await reponse.json().catch(() => ({}))) as { chemin?: string; erreur?: string };
  if (!reponse.ok || !json.chemin) throw new ErreurAtelier(json.erreur ?? "L'envoi du skin a échoué.");
  return json.chemin;
}

export async function televerserRendus(
  tenueId: string,
  photos: Photos,
): Promise<{ portrait_path: string; vignette_path: string }> {
  const sb = supabaseNavigateur();
  const horodatage = Date.now();
  const type = photos.extension === "webp" ? "image/webp" : "image/png";
  const portrait_path = `${tenueId}/portrait-${horodatage}.${photos.extension}`;
  const vignette_path = `${tenueId}/vignette-${horodatage}.${photos.extension}`;
  const options = { contentType: type, cacheControl: "31536000", upsert: false };
  const [a, b] = await Promise.all([
    sb.storage.from("renders").upload(portrait_path, photos.portrait, options),
    sb.storage.from("renders").upload(vignette_path, photos.vignette, options),
  ]);
  if (a.error || b.error) throw new ErreurAtelier("Les images de la tenue n'ont pas pu être enregistrées.");
  return { portrait_path, vignette_path };
}

export async function supprimerRendus(chemins: (string | null | undefined)[]) {
  const liste = chemins.filter((c): c is string => Boolean(c));
  if (liste.length) await supabaseNavigateur().storage.from("renders").remove(liste);
}

export async function supprimerSkins(chemins: (string | null | undefined)[]) {
  const liste = chemins.filter((c): c is string => Boolean(c));
  if (liste.length) await supabaseNavigateur().storage.from("skins").remove(liste);
}

export async function supprimerFichiersTenue(tenue: Pick<Tenue, "skin_path" | "portrait_path" | "vignette_path">) {
  await Promise.all([supprimerSkins([tenue.skin_path]), supprimerRendus([tenue.portrait_path, tenue.vignette_path])]);
}

/** Régénère les pages publiques après une modification. */
export async function revalider(): Promise<void> {
  try {
    await fetch("/api/revalider", { method: "POST" });
  } catch {
    // Les pages se mettront à jour au prochain cycle.
  }
}

let minuterieRevalidation: ReturnType<typeof setTimeout> | null = null;

/** Variante différée, pour les enregistrements rapprochés (tier lists). */
export function revaliderPlusTard(delai = 4000) {
  if (minuterieRevalidation) clearTimeout(minuterieRevalidation);
  minuterieRevalidation = setTimeout(() => void revalider(), delai);
}
