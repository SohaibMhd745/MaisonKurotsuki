"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Dialogue } from "@/components/Dialogue";
import { ImageTenue } from "@/components/Portrait";
import { VueSkin, type VueSkinRef } from "@/components/VueSkin";
import { imageSkin } from "@/lib/skins";
import type { Collection, Tenue } from "@/lib/types";

/** Une tenue en grand, en 3D, sans quitter le classement. */
export function ApercuTenue({
  tenue,
  collection,
  onFermer,
}: {
  tenue: Tenue | null;
  collection?: Collection;
  onFermer: () => void;
}) {
  return (
    <Dialogue ouvert={Boolean(tenue)} onFermer={onFermer} titre={tenue?.nom ?? ""} large className="apercu">
      {tenue && <Contenu tenue={tenue} collection={collection} />}
    </Dialogue>
  );
}

function Contenu({ tenue, collection }: { tenue: Tenue; collection?: Collection }) {
  const vue = useRef<VueSkinRef>(null);
  useEffect(() => {
    let actif = true;
    imageSkin(tenue.skin_path)
      .then((img) => actif && vue.current?.charger(img, tenue.gabarit))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [tenue]);

  return (
    <div className="apercu__contenu">
      <div className="apercu__scene">
        <div className="lookbook__projecteur" aria-hidden />
        <VueSkin
          ref={vue}
          libelle={`${tenue.nom}, vue en trois dimensions`}
          repli={<ImageTenue tenue={tenue} />}
        />
      </div>
      <div className="apercu__texte">
        {collection && <p className="sous-titre">{collection.titre}</p>}
        {tenue.details && <p>{tenue.details}</p>}
        <Link href={`/lookbook/${tenue.slug}`} className="bouton bouton--discret">
          Ouvrir dans le lookbook
        </Link>
      </div>
    </div>
  );
}
