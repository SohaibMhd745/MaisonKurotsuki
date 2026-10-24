"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { VueSkin, type VueSkinRef } from "@/components/VueSkin";
import { ErreurAtelier } from "@/lib/atelier";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Collection, Gabarit, Lettre, Membre, Role, Tenue } from "@/lib/types";
import { LettreBienvenue, LettreOnglet } from "./Lettre";
import { MesCollections } from "./MesCollections";
import { MesTenues } from "./MesTenues";
import { NouvelleTenue } from "./NouvelleTenue";
import type { Photographe } from "./operations";
import { Sauvegarde } from "./Sauvegarde";

type Onglet = "nouvelle" | "tenues" | "collections" | "lettre" | "sauvegarde";

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: "nouvelle", libelle: "Nouvelle tenue" },
  { id: "tenues", libelle: "Mes tenues" },
  { id: "collections", libelle: "Mes collections" },
  { id: "lettre", libelle: "La lettre" },
  { id: "sauvegarde", libelle: "Sauvegarde" },
];

export interface Atelier {
  role: Role;
  tenues: Tenue[];
  collections: Collection[];
  setTenues: React.Dispatch<React.SetStateAction<Tenue[]>>;
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
  /** Montre un skin dans le miroir de loge. */
  montrer: (image: HTMLImageElement | HTMLCanvasElement | null, gabarit: Gabarit, legende?: string) => void;
  /** Photographie un skin avec la vue du miroir (portrait + vignette). */
  photographier: Photographe;
}

interface Props {
  role: Role;
  moi: Membre | null;
  tenuesInitiales: Tenue[];
  collectionsInitiales: Collection[];
  lettreInitiale: Lettre | null;
}

export function Coulisses({ role, moi, tenuesInitiales, collectionsInitiales, lettreInitiale }: Props) {
  const router = useRouter();
  const [tenues, setTenues] = useState(tenuesInitiales);
  const [collections, setCollections] = useState(collectionsInitiales);
  const [lettre, setLettre] = useState(lettreInitiale);
  const [onglet, setOnglet] = useState<Onglet>("nouvelle");
  const [lettreOuverte, setLettreOuverte] = useState(
    role === "creatrice" && Boolean(lettreInitiale?.texte.trim()) && !lettreInitiale?.lue_le,
  );
  const miroir = useRef<VueSkinRef>(null);
  const [legendeMiroir, setLegendeMiroir] = useState<string | null>(null);
  const [miroirVide, setMiroirVide] = useState(true);
  const [miroirPret, setMiroirPret] = useState(false);

  useEffect(() => {
    // La lettre s'affiche en grand avant tout le reste ; on évite le défilement dessous.
    document.documentElement.classList.toggle("sans-defilement", lettreOuverte);
    return () => document.documentElement.classList.remove("sans-defilement");
  }, [lettreOuverte]);

  const montrer = useCallback<Atelier["montrer"]>((image, gabarit, legende) => {
    setMiroirVide(!image);
    setLegendeMiroir(legende ?? null);
    if (image) miroir.current?.charger(image, gabarit);
  }, []);

  const photographier = useCallback<Photographe>((image, gabarit) => {
    miroir.current?.charger(image, gabarit);
    const photos = miroir.current?.photographier();
    if (!photos) {
      throw new ErreurAtelier(
        "Ce navigateur n'affiche pas la 3D : les images de la tenue ne peuvent pas être créées. Essayez avec un autre navigateur.",
      );
    }
    return photos;
  }, []);

  const ranger = async () => {
    setLettreOuverte(false);
    if (role === "creatrice" && !lettre?.lue_le) {
      await supabaseNavigateur().rpc("marquer_lettre_lue");
      setLettre((l) => (l ? { ...l, lue_le: new Date().toISOString() } : l));
    }
  };

  const deconnecter = async () => {
    await supabaseNavigateur().auth.signOut();
    router.push("/");
    router.refresh();
  };

  const atelier: Atelier = { role, tenues, collections, setTenues, setCollections, montrer, photographier };

  return (
    <div className="page coulisses">
      {lettreOuverte && lettre && <LettreBienvenue lettre={lettre} onRanger={ranger} />}

      <header className="page__entete page__entete--actions coulisses__entete">
        <div>
          <p className="legende">Réservé à la Maison</p>
          <h1 className="titre-1">Les Coulisses</h1>
        </div>
        <div className="coulisses__compte">
          {moi?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="avatar" src={moi.avatar_url} alt="" width={32} height={32} />
          )}
          <span className="texte-doux">{moi?.nom ?? (role === "creatrice" ? "La créatrice" : "Membre")}</span>
          {role === "creatrice" && lettre?.texte.trim() && (
            <button type="button" className="bouton bouton--discret" onClick={() => setLettreOuverte(true)}>
              Relire la lettre
            </button>
          )}
          <button type="button" className="bouton bouton--discret" onClick={deconnecter}>
            Se déconnecter
          </button>
        </div>
      </header>

      <nav className="onglets" aria-label="Sections des Coulisses">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            className="onglet"
            aria-current={onglet === o.id ? "page" : undefined}
            onClick={() => setOnglet(o.id)}
          >
            {o.libelle}
          </button>
        ))}
      </nav>

      <div className="coulisses__atelier">
        <div className="coulisses__contenu">
          {onglet === "nouvelle" && <NouvelleTenue atelier={atelier} onVoirTenues={() => setOnglet("tenues")} />}
          {onglet === "tenues" && <MesTenues atelier={atelier} />}
          {onglet === "collections" && <MesCollections atelier={atelier} />}
          {onglet === "lettre" && (
            <LettreOnglet role={role} lettre={lettre} onChange={setLettre} onRelire={() => setLettreOuverte(true)} />
          )}
          {onglet === "sauvegarde" && <Sauvegarde atelier={atelier} />}
        </div>

        <aside className="miroir" aria-label="Miroir de loge">
          <div className="miroir__cadre">
            <div className="lookbook__projecteur" aria-hidden />
            <VueSkin
              ref={miroir}
              capture
              className="miroir__vue"
              libelle={legendeMiroir ? `${legendeMiroir}, vue en trois dimensions` : "Miroir de loge"}
              repli={<p className="legende miroir__repli">La 3D n&apos;est pas disponible dans ce navigateur.</p>}
              onPret={() => setMiroirPret(true)}
            />
            {miroirVide && miroirPret && <p className="miroir__invite legende">Le miroir attend une tenue.</p>}
          </div>
          <p className="legende miroir__legende">{legendeMiroir ?? "Miroir de loge"}</p>
        </aside>
      </div>
    </div>
  );
}
