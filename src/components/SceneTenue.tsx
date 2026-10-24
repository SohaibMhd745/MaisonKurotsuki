"use client";

import { useEffect, useRef, useState } from "react";
import { ImageTenue } from "./Portrait";
import { VueSkin, type VueSkinRef } from "./VueSkin";
import { regarderTroisQuarts } from "@/lib/skin3d";
import { imageSkin } from "@/lib/skins";
import type { Tenue } from "@/lib/types";

/**
 * Rendu vivant en 3D de la première création sur le Foyer.
 * Affiche l'image statique en fondu instantané puis anime le modèle 3D en trois quarts.
 */
export function SceneTenue({ tenue }: { tenue: Tenue }) {
  const vueRef = useRef<VueSkinRef>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let actif = true;
    imageSkin(tenue.skin_path)
      .then((image) => {
        if (!actif) return;
        vueRef.current?.charger(image, tenue.gabarit);
        const v = vueRef.current?.vue();
        if (v) {
          v.controls.enableZoom = false;
          regarderTroisQuarts(v);
        }
        setCharge(true);
      })
      .catch(() => {});

    return () => {
      actif = false;
    };
  }, [tenue]);

  return (
    <div className="scene__vue-3d">
      <VueSkin
        ref={vueRef}
        zoom={false}
        className={`scene__vue-skin ${charge ? "scene__vue-skin--active" : "scene__vue-skin--chargement"}`}
        libelle={`${tenue.nom}, vue vivante en trois dimensions. Faites glisser pour tourner.`}
        repli={<ImageTenue tenue={tenue} prioritaire className="scene__portrait" />}
        onPret={() => {
          const v = vueRef.current?.vue();
          if (v) {
            v.controls.enableZoom = false;
            regarderTroisQuarts(v);
          }
        }}
      />
      <ImageTenue
        tenue={tenue}
        prioritaire
        className={`scene__portrait scene__portrait--repli ${charge ? "scene__portrait--masque" : ""}`}
      />
    </div>
  );
}
