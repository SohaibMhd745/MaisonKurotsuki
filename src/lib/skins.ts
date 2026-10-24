"use client";

import { supabaseNavigateur } from "./supabase/client";
import { chargerImage } from "./skin3d";

/**
 * Cache des skins téléchargés : les voisins sont préchargés pour que le
 * changement de tenue paraisse immédiat. Les skins sont lus via l'API de
 * stockage, qui applique les règles d'accès (tenues publiées ou membres).
 */
const cache = new Map<string, Promise<HTMLImageElement>>();

export function imageSkin(chemin: string): Promise<HTMLImageElement> {
  let promesse = cache.get(chemin);
  if (!promesse) {
    promesse = supabaseNavigateur()
      .storage.from("skins")
      .download(chemin)
      .then(({ data, error }) => {
        if (error || !data) throw error ?? new Error("Skin introuvable");
        return chargerImage(URL.createObjectURL(data));
      });
    promesse.catch(() => cache.delete(chemin));
    cache.set(chemin, promesse);
  }
  return promesse;
}

export function prechargerSkins(chemins: string[]) {
  chemins.forEach((c) => void imageSkin(c).catch(() => {}));
}

export async function blobSkin(chemin: string): Promise<Blob> {
  const { data, error } = await supabaseNavigateur().storage.from("skins").download(chemin);
  if (error || !data) throw error ?? new Error("Skin introuvable");
  return data;
}
