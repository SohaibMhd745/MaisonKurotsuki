"use client";

import { IdleAnimation, SkinViewer } from "skinview3d";
import { inferModelType, loadSkinToCanvas } from "skinview-utils";
import type { Gabarit } from "./types";

/** Rendu 3D des skins (section 5.3) et prise de vue des images statiques (5.4). */

export const PORTRAIT = { largeur: 600, hauteur: 1200 } as const;
export const VIGNETTE = { largeur: 200, hauteur: 400 } as const;

/** Cadrage commun à toutes les tenues : trois quarts, en pied. */
const PRISE_DE_VUE = {
  fov: 30,
  distance: 78,
  azimut: (-30 * Math.PI) / 180,
  elevation: (6 * Math.PI) / 180,
  cibleY: -0.5,
};

const LUMIERE = { ambiante: 2.4, projecteur: 0.9 };
const DISTANCE_MIN = 26;
const DISTANCE_MAX = 64;

export function webglDisponible(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export const versModele = (g: Gabarit) => (g === "slim" ? "slim" : "default");

export interface OptionsVue {
  canvas: HTMLCanvasElement;
  largeur: number;
  hauteur: number;
  animation?: boolean;
  capture?: boolean;
}

export function creerVue({ canvas, largeur, hauteur, animation = true, capture = false }: OptionsVue): SkinViewer {
  const vue = new SkinViewer({
    canvas,
    width: largeur,
    height: hauteur,
    preserveDrawingBuffer: capture,
    fov: 42,
    zoom: 0.92,
  });
  vue.background = null;
  vue.globalLight.intensity = LUMIERE.ambiante;
  vue.cameraLight.intensity = LUMIERE.projecteur;
  vue.controls.enablePan = false;
  vue.controls.enableZoom = true;
  vue.controls.minDistance = DISTANCE_MIN;
  vue.controls.maxDistance = DISTANCE_MAX;
  vue.controls.rotateSpeed = 0.7;
  vue.playerObject.skin.setOuterLayerVisible(true);
  if (animation) vue.animation = respiration();
  return vue;
}

export function respiration(): IdleAnimation {
  const anim = new IdleAnimation();
  anim.speed = 0.55;
  return anim;
}

/** Charge un skin dans une vue existante (on ne recrée jamais la vue). */
export function chargerSkin(vue: SkinViewer, source: HTMLImageElement | HTMLCanvasElement, gabarit: Gabarit) {
  vue.loadSkin(source, { model: versModele(gabarit) });
  vue.playerObject.skin.setOuterLayerVisible(true);
}

export function chargerImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image illisible"));
    img.src = url;
  });
}

/** Détection automatique bras larges / bras fins. */
export function detecterGabarit(image: HTMLImageElement | HTMLCanvasElement): Gabarit {
  if (image.height === 32) return "classic";
  const canvas = document.createElement("canvas");
  loadSkinToCanvas(canvas, image);
  return inferModelType(canvas) === "slim" ? "slim" : "classic";
}

/** Pixels RGBA d'une image, pour la vérification « skin vide ». */
export function pixelsImage(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

export function regarderDeFace(vue: SkinViewer) {
  vue.resetCameraPose();
  vue.controls.target.set(0, 0, 0);
  vue.controls.update();
}

export interface Photos {
  portrait: Blob;
  vignette: Blob;
  extension: "webp" | "png";
}

function dataUrlVersBlob(dataUrl: string): Blob {
  const [entete, donnees] = dataUrl.split(",");
  const type = entete.slice(5, entete.indexOf(";"));
  const binaire = atob(donnees);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type });
}

function encoder(canvas: HTMLCanvasElement): { url: string; extension: "webp" | "png" } {
  const webp = canvas.toDataURL("image/webp", 0.92);
  if (webp.startsWith("data:image/webp")) return { url: webp, extension: "webp" };
  return { url: canvas.toDataURL("image/png"), extension: "png" };
}

/**
 * Photographie le skin actuellement chargé dans la vue : même angle, même
 * cadrage, même éclairage pour toutes les tenues. Tout se fait dans la même
 * tâche, si bien que le navigateur n'affiche jamais les étapes intermédiaires.
 * La vue doit avoir été créée avec `capture: true` (preserveDrawingBuffer).
 */
export function photographier(vue: SkinViewer): Photos {
  const largeur = vue.width;
  const hauteur = vue.height;
  const ratio = vue.pixelRatio;
  const fov = vue.camera.fov;
  const position = vue.camera.position.clone();
  const cible = vue.controls.target.clone();
  const animation = vue.animation;
  const lumieres = [vue.globalLight.intensity, vue.cameraLight.intensity];
  const enPause = vue.renderPaused;

  vue.renderPaused = true;
  vue.animation = null;
  vue.globalLight.intensity = LUMIERE.ambiante;
  vue.cameraLight.intensity = LUMIERE.projecteur;
  vue.pixelRatio = 1;
  vue.camera.fov = PRISE_DE_VUE.fov;

  const d = PRISE_DE_VUE.distance;
  vue.camera.position.set(
    d * Math.cos(PRISE_DE_VUE.elevation) * Math.sin(PRISE_DE_VUE.azimut),
    PRISE_DE_VUE.cibleY + d * Math.sin(PRISE_DE_VUE.elevation),
    d * Math.cos(PRISE_DE_VUE.elevation) * Math.cos(PRISE_DE_VUE.azimut),
  );
  vue.camera.lookAt(0, PRISE_DE_VUE.cibleY, 0);

  const prendre = (l: number, h: number) => {
    vue.setSize(l, h);
    vue.camera.lookAt(0, PRISE_DE_VUE.cibleY, 0);
    vue.render();
    return encoder(vue.canvas);
  };

  const portrait = prendre(PORTRAIT.largeur, PORTRAIT.hauteur);
  const vignette = prendre(VIGNETTE.largeur, VIGNETTE.hauteur);

  vue.pixelRatio = ratio;
  vue.camera.fov = fov;
  vue.setSize(largeur, hauteur);
  vue.camera.position.copy(position);
  vue.controls.target.copy(cible);
  vue.controls.update();
  vue.globalLight.intensity = lumieres[0];
  vue.cameraLight.intensity = lumieres[1];
  vue.animation = animation;
  vue.render();
  vue.renderPaused = enPause;

  return {
    portrait: dataUrlVersBlob(portrait.url),
    vignette: dataUrlVersBlob(vignette.url),
    extension: portrait.extension,
  };
}
