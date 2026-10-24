"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { SkinViewer } from "skinview3d";
import { chargerSkin, creerVue, photographier, webglDisponible, type Photos } from "@/lib/skin3d";
import type { Gabarit } from "@/lib/types";

export interface VueSkinRef {
  /** Charge un skin dans la vue existante. */
  charger: (image: HTMLImageElement | HTMLCanvasElement, gabarit: Gabarit) => void;
  /** Change le gabarit du skin affiché. */
  gabarit: (gabarit: Gabarit) => void;
  /** Prend le portrait et la vignette (vue créée avec `capture`). */
  photographier: () => Photos | null;
  vue: () => SkinViewer | null;
}

interface Props {
  className?: string;
  /** Image affichée si WebGL n'est pas disponible. */
  repli?: React.ReactNode;
  capture?: boolean;
  libelle: string;
  onPret?: () => void;
  onInteraction?: () => void;
}

/**
 * L'unique vue 3D d'une page. Elle suit la taille de son conteneur, se
 * réutilise à chaque changement de tenue et se libère en quittant la page.
 */
export const VueSkin = forwardRef<VueSkinRef, Props>(function VueSkin(
  { className = "", repli, capture = false, libelle, onPret, onInteraction },
  ref,
) {
  const conteneur = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const vue = useRef<SkinViewer | null>(null);
  const courant = useRef<{ image: HTMLImageElement | HTMLCanvasElement; gabarit: Gabarit } | null>(null);
  const [sansWebgl, setSansWebgl] = useState(false);
  const rappelPret = useRef(onPret);
  rappelPret.current = onPret;

  useEffect(() => {
    if (!canvas.current || !conteneur.current) return;
    if (!webglDisponible()) {
      setSansWebgl(true);
      return;
    }
    let instance: SkinViewer;
    try {
      const { width, height } = conteneur.current.getBoundingClientRect();
      instance = creerVue({
        canvas: canvas.current,
        largeur: Math.max(1, width),
        hauteur: Math.max(1, height),
        capture,
      });
    } catch {
      setSansWebgl(true);
      return;
    }
    vue.current = instance;
    if (courant.current) chargerSkin(instance, courant.current.image, courant.current.gabarit);

    const observateur = new ResizeObserver(([entree]) => {
      const { width, height } = entree.contentRect;
      if (width > 0 && height > 0) instance.setSize(width, height);
    });
    observateur.observe(conteneur.current);
    rappelPret.current?.();

    return () => {
      observateur.disconnect();
      instance.dispose();
      vue.current = null;
    };
  }, [capture]);

  useImperativeHandle(
    ref,
    () => ({
      charger(image, gabarit) {
        courant.current = { image, gabarit };
        if (vue.current) chargerSkin(vue.current, image, gabarit);
      },
      gabarit(gabarit) {
        if (!courant.current) return;
        courant.current.gabarit = gabarit;
        if (vue.current) chargerSkin(vue.current, courant.current.image, gabarit);
      },
      photographier() {
        return vue.current && courant.current ? photographier(vue.current) : null;
      },
      vue: () => vue.current,
    }),
    [],
  );

  if (sansWebgl) return <div className={`vue-skin vue-skin--repli ${className}`}>{repli}</div>;

  return (
    <div
      ref={conteneur}
      className={`vue-skin ${className}`}
      onPointerDown={onInteraction}
      onWheel={onInteraction}
    >
      <canvas ref={canvas} role="img" aria-label={libelle} />
    </div>
  );
});
