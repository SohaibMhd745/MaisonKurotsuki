/**
 * Vérifications d'un fichier de skin (section 5.1).
 * Partagées entre le navigateur (retour immédiat) et le serveur.
 */

export const POIDS_MAX = 200 * 1024;

const SIGNATURE_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export type IdVerification = "format" | "dimensions" | "poids" | "contenu";

export interface Verification {
  id: IdVerification;
  ok: boolean;
  message: string;
}

export interface ResultatVerifications {
  ok: boolean;
  verifications: Verification[];
  largeur?: number;
  hauteur?: number;
}

export function estPng(octets: Uint8Array): boolean {
  return SIGNATURE_PNG.every((v, i) => octets[i] === v);
}

/** Dimensions lues dans l'en-tête IHDR, sans décoder l'image. */
export function dimensionsPng(octets: Uint8Array): { largeur: number; hauteur: number } | null {
  if (octets.length < 24 || !estPng(octets)) return null;
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  return { largeur: vue.getUint32(16), hauteur: vue.getUint32(20) };
}

export function dimensionsValides(largeur: number, hauteur: number): boolean {
  return largeur === 64 && (hauteur === 64 || hauteur === 32);
}

const ko = (octets: number) => `${Math.max(1, Math.round(octets / 1024))} Ko`;

/**
 * @param octets   le fichier brut
 * @param pixels   les pixels RGBA décodés (null si le décodage a échoué)
 */
export function verifierSkin(octets: Uint8Array, pixels: Uint8ClampedArray | Uint8Array | null): ResultatVerifications {
  const verifications: Verification[] = [];
  const png = estPng(octets);
  verifications.push(
    png
      ? { id: "format", ok: true, message: "Image PNG" }
      : { id: "format", ok: false, message: "Ce fichier n'est pas une image PNG." },
  );

  const dim = png ? dimensionsPng(octets) : null;
  if (dim) {
    const ok = dimensionsValides(dim.largeur, dim.hauteur);
    verifications.push({
      id: "dimensions",
      ok,
      message: ok
        ? dim.hauteur === 32
          ? "64 × 32 pixels (format ancien)"
          : "64 × 64 pixels"
        : `Un skin mesure 64 × 64 pixels ; celui-ci fait ${dim.largeur} × ${dim.hauteur}.`,
    });
  }

  verifications.push(
    octets.byteLength <= POIDS_MAX
      ? { id: "poids", ok: true, message: ko(octets.byteLength) }
      : { id: "poids", ok: false, message: "Ce fichier est trop lourd pour un skin (200 Ko maximum)." },
  );

  if (png && dim && dimensionsValides(dim.largeur, dim.hauteur) && pixels) {
    let visible = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) {
        visible = true;
        break;
      }
    }
    verifications.push(
      visible
        ? { id: "contenu", ok: true, message: "Le skin contient des pixels visibles" }
        : { id: "contenu", ok: false, message: "Ce skin semble vide." },
    );
  }

  return {
    ok: verifications.every((v) => v.ok) && verifications.length === 4,
    verifications,
    largeur: dim?.largeur,
    hauteur: dim?.hauteur,
  };
}
