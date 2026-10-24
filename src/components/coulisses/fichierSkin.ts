"use client";

import { chargerImage, detecterGabarit, pixelsImage } from "@/lib/skin3d";
import type { Gabarit } from "@/lib/types";
import { estPng, verifierSkin, type ResultatVerifications } from "@/lib/verifications";

export interface AnalyseSkin {
  fichier: File;
  resultat: ResultatVerifications;
  image: HTMLImageElement | null;
  gabarit: Gabarit;
}

/** Vérifications immédiates dans le navigateur, avant tout envoi. */
export async function analyserFichier(fichier: File): Promise<AnalyseSkin> {
  const octets = new Uint8Array(await fichier.arrayBuffer());
  let image: HTMLImageElement | null = null;
  let pixels: Uint8ClampedArray | null = null;
  if (estPng(octets)) {
    try {
      image = await chargerImage(URL.createObjectURL(fichier));
      pixels = pixelsImage(image);
    } catch {
      image = null;
    }
  }
  const resultat = verifierSkin(octets, pixels);
  const valide = resultat.ok && image;
  return {
    fichier,
    resultat,
    image: valide ? image : null,
    gabarit: valide ? detecterGabarit(image!) : "classic",
  };
}
