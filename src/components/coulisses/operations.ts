"use client";

import {
  ErreurAtelier,
  revalider,
  supprimerFichiersTenue,
  supprimerRendus,
  supprimerSkins,
  televerserRendus,
  televerserSkin,
} from "@/lib/atelier";
import type { Photos } from "@/lib/skin3d";
import { slugUnique } from "@/lib/slug";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Collection, Gabarit, Statut, Tenue } from "@/lib/types";

export type Photographe = (image: HTMLImageElement | HTMLCanvasElement, gabarit: Gabarit) => Photos;

export interface ChampsTenue {
  nom: string;
  details: string;
  note: string;
  creee_pour: string;
}

export async function creerCollection(titre: string, description: string, existantes: Collection[]): Promise<Collection> {
  const { data, error } = await supabaseNavigateur()
    .from("collections")
    .insert({
      titre: titre.trim(),
      description: description.trim(),
      slug: slugUnique(titre, existantes.map((c) => c.slug)),
      ordre: existantes.reduce((max, c) => Math.max(max, c.ordre), -1) + 1,
    })
    .select("*")
    .single();
  if (error || !data) throw new ErreurAtelier("La collection n'a pas pu être créée.");
  return data as Collection;
}

/** Ajout d'une tenue : skin vérifié par le serveur, images, puis la fiche. */
export async function creerTenue(options: {
  fichier: File;
  image: HTMLImageElement;
  gabarit: Gabarit;
  champs: ChampsTenue;
  statut: Statut;
  collectionId: string;
  tenues: Tenue[];
  photographier: Photographe;
}): Promise<Tenue> {
  const { fichier, image, gabarit, champs, statut, collectionId, tenues, photographier } = options;
  const id = crypto.randomUUID();
  const photos = photographier(image, gabarit);
  const skin_path = await televerserSkin(fichier, id);
  let rendus: { portrait_path: string; vignette_path: string } | null = null;
  try {
    rendus = await televerserRendus(id, photos);
    const { data, error } = await supabaseNavigateur()
      .from("tenues")
      .insert({
        id,
        slug: slugUnique(champs.nom, tenues.map((t) => t.slug)),
        nom: champs.nom.trim(),
        details: champs.details.trim(),
        note: champs.note.trim(),
        creee_pour: champs.creee_pour.trim(),
        collection_id: collectionId,
        gabarit,
        statut,
        ordre: tenues.filter((t) => t.collection_id === collectionId).reduce((m, t) => Math.max(m, t.ordre), -1) + 1,
        skin_path,
        ...rendus,
      })
      .select("*")
      .single();
    if (error || !data) throw new ErreurAtelier("La fiche de la tenue n'a pas pu être enregistrée.");
    await revalider();
    return data as Tenue;
  } catch (e) {
    await supprimerSkins([skin_path]).catch(() => {});
    if (rendus) await supprimerRendus([rendus.portrait_path, rendus.vignette_path]).catch(() => {});
    throw e;
  }
}

export async function modifierTenue(id: string, modifs: Partial<Tenue>): Promise<Tenue> {
  const { data, error } = await supabaseNavigateur().from("tenues").update(modifs).eq("id", id).select("*").single();
  if (error || !data) throw new ErreurAtelier("La modification n'a pas pu être enregistrée.");
  await revalider();
  return data as Tenue;
}

/** Nouvelles images pour une tenue (gabarit changé, cadrage ajusté…). */
export async function regenererImages(
  tenue: Tenue,
  image: HTMLImageElement | HTMLCanvasElement,
  gabarit: Gabarit,
  photographier: Photographe,
  autres: Partial<Tenue> = {},
  sansRevalidation = false,
): Promise<Tenue> {
  const rendus = await televerserRendus(tenue.id, photographier(image, gabarit));
  const { data, error } = await supabaseNavigateur()
    .from("tenues")
    .update({ ...autres, ...rendus, gabarit })
    .eq("id", tenue.id)
    .select("*")
    .single();
  if (error || !data) {
    await supprimerRendus([rendus.portrait_path, rendus.vignette_path]).catch(() => {});
    throw new ErreurAtelier("Les nouvelles images n'ont pas pu être enregistrées.");
  }
  await supprimerRendus([tenue.portrait_path, tenue.vignette_path]).catch(() => {});
  if (!sansRevalidation) await revalider();
  return data as Tenue;
}

/** Remplace le fichier PNG : nouveau skin, nouvelles images, anciens fichiers supprimés. */
export async function remplacerSkin(
  tenue: Tenue,
  fichier: File,
  image: HTMLImageElement,
  gabarit: Gabarit,
  photographier: Photographe,
): Promise<Tenue> {
  const skin_path = await televerserSkin(fichier, tenue.id);
  try {
    const maj = await regenererImages(tenue, image, gabarit, photographier, { skin_path });
    await supprimerSkins([tenue.skin_path]).catch(() => {});
    return maj;
  } catch (e) {
    await supprimerSkins([skin_path]).catch(() => {});
    throw e;
  }
}

export async function supprimerTenue(tenue: Tenue): Promise<void> {
  const { error } = await supabaseNavigateur().from("tenues").delete().eq("id", tenue.id);
  if (error) throw new ErreurAtelier("La tenue n'a pas pu être supprimée.");
  await supprimerFichiersTenue(tenue).catch(() => {});
  await revalider();
}

/** Enregistre un nouvel ordre (collections ou tenues d'une collection). */
export async function enregistrerOrdre(table: "collections" | "tenues", ids: string[]): Promise<void> {
  const sb = supabaseNavigateur();
  const resultats = await Promise.all(ids.map((id, ordre) => sb.from(table).update({ ordre }).eq("id", id)));
  if (resultats.some((r) => r.error)) throw new ErreurAtelier("Le nouvel ordre n'a pas pu être enregistré.");
  await revalider();
}

export function messageErreur(e: unknown): string {
  return e instanceof ErreurAtelier ? e.message : "Quelque chose s'est mal passé. Réessayez dans un instant.";
}
