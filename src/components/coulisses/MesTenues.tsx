"use client";

import Link from "next/link";
import { useState } from "react";
import { Confirmation, Dialogue } from "@/components/Dialogue";
import { ListeTriable } from "@/components/ListeTriable";
import { ImageTenue } from "@/components/Portrait";
import { imageSkin } from "@/lib/skins";
import { ordreCollection } from "@/lib/tri";
import type { Gabarit, Statut, Tenue } from "@/lib/types";
import type { Atelier } from "./Coulisses";
import { ChoixGabarit, DepotSkin, ListeVerifications } from "./Depot";
import { analyserFichier, type AnalyseSkin } from "./fichierSkin";
import {
  enregistrerOrdre,
  messageErreur,
  modifierTenue,
  regenererImages,
  remplacerSkin,
  supprimerTenue,
} from "./operations";

const LIBELLES_STATUT: Record<Statut, string> = {
  publiee: "Publiée",
  masquee: "Masquée",
  brouillon: "Brouillon",
};

export function MesTenues({ atelier }: { atelier: Atelier }) {
  const { tenues, collections, setTenues, montrer } = atelier;
  const [aModifier, setAModifier] = useState<Tenue | null>(null);
  const [aRemplacer, setARemplacer] = useState<Tenue | null>(null);
  const [aSupprimer, setASupprimer] = useState<Tenue | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState("");

  const remplacerDansListe = (t: Tenue) => setTenues((ts) => ts.map((x) => (x.id === t.id ? t : x)));

  const voir = async (t: Tenue) => {
    try {
      montrer(await imageSkin(t.skin_path), t.gabarit, t.nom);
    } catch {
      // Le miroir garde la tenue précédente.
    }
  };

  const basculer = async (t: Tenue) => {
    setOccupe(t.id);
    setErreur("");
    try {
      remplacerDansListe(await modifierTenue(t.id, { statut: t.statut === "publiee" ? "masquee" : "publiee" }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(null);
    }
  };

  const supprimer = async () => {
    if (!aSupprimer) return;
    setOccupe(aSupprimer.id);
    try {
      await supprimerTenue(aSupprimer);
      setTenues((ts) => ts.filter((x) => x.id !== aSupprimer.id));
      setASupprimer(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(null);
    }
  };

  const reordonner = async (collectionId: string, ordonnees: Tenue[]) => {
    const rangs = new Map(ordonnees.map((t, i) => [t.id, i]));
    setTenues((ts) => ts.map((t) => (t.collection_id === collectionId ? { ...t, ordre: rangs.get(t.id) ?? t.ordre } : t)));
    try {
      await enregistrerOrdre("tenues", ordonnees.map((t) => t.id));
    } catch (e) {
      setErreur(messageErreur(e));
    }
  };

  if (tenues.length === 0) {
    return (
      <section className="section-coulisses">
        <h2 className="titre-2">Mes tenues</h2>
        <p className="texte-doux">Aucune tenue pour l&apos;instant : commencez par « Nouvelle tenue ».</p>
      </section>
    );
  }

  return (
    <section className="section-coulisses">
      <h2 className="titre-2">Mes tenues</h2>
      <p className="texte-doux">
        {tenues.length} {tenues.length > 1 ? "tenues" : "tenue"}, brouillons compris. Faites glisser la poignée pour
        changer l&apos;ordre dans une collection ; cliquez sur une tenue pour la voir dans le miroir.
      </p>
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}

      {collections.map((c) => {
        const dedans = ordreCollection(tenues.filter((t) => t.collection_id === c.id));
        if (dedans.length === 0) return null;
        return (
          <div key={c.id} className="groupe-tenues">
            <h3 className="titre-3">{c.titre}</h3>
            <ListeTriable
              elements={dedans}
              libelle={(t) => t.nom}
              onReordonner={(liste) => void reordonner(c.id, liste)}
              rendu={(t, poignee) => (
                <div className={`ligne-tenue ligne-tenue--${t.statut}`}>
                  {poignee}
                  <button type="button" className="ligne-tenue__apercu" onClick={() => void voir(t)} aria-label={`Voir ${t.nom} dans le miroir`}>
                    <ImageTenue tenue={t} format="vignette" />
                  </button>
                  <div className="ligne-tenue__infos">
                    <button type="button" className="ligne-tenue__nom" onClick={() => void voir(t)}>
                      {t.nom}
                    </button>
                    <span className={`pastille pastille--${t.statut}`}>{LIBELLES_STATUT[t.statut]}</span>
                    {t.statut === "publiee" && (
                      <Link href={`/lookbook/${t.slug}`} className="legende lien-discret">
                        /lookbook/{t.slug}
                      </Link>
                    )}
                  </div>
                  <div className="ligne-tenue__actions">
                    <button type="button" className="bouton bouton--petit bouton--discret" onClick={() => setAModifier(t)}>
                      Modifier
                    </button>
                    <button type="button" className="bouton bouton--petit bouton--discret" onClick={() => setARemplacer(t)}>
                      Remplacer le PNG
                    </button>
                    <button
                      type="button"
                      className="bouton bouton--petit bouton--discret"
                      onClick={() => void basculer(t)}
                      disabled={occupe === t.id}
                    >
                      {t.statut === "publiee" ? "Masquer" : "Publier"}
                    </button>
                    <button type="button" className="bouton bouton--petit bouton--danger-discret" onClick={() => setASupprimer(t)}>
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            />
          </div>
        );
      })}

      <ModifierTenue
        tenue={aModifier}
        atelier={atelier}
        onFermer={() => setAModifier(null)}
        onEnregistre={(t) => {
          remplacerDansListe(t);
          setAModifier(null);
        }}
      />
      <RemplacerSkin
        tenue={aRemplacer}
        atelier={atelier}
        onFermer={() => setARemplacer(null)}
        onEnregistre={(t) => {
          remplacerDansListe(t);
          setARemplacer(null);
        }}
      />
      <Confirmation
        ouvert={Boolean(aSupprimer)}
        titre="Supprimer cette tenue ?"
        message={
          <p>
            « {aSupprimer?.nom} » sera retirée de la garde-robe et des classements, et ses fichiers seront supprimés.
            Cette action est définitive.
          </p>
        }
        action="Supprimer la tenue"
        occupe={occupe === aSupprimer?.id}
        onConfirmer={() => void supprimer()}
        onAnnuler={() => setASupprimer(null)}
      />
    </section>
  );
}

function ModifierTenue({
  tenue,
  atelier,
  onFermer,
  onEnregistre,
}: {
  tenue: Tenue | null;
  atelier: Atelier;
  onFermer: () => void;
  onEnregistre: (t: Tenue) => void;
}) {
  return (
    <Dialogue ouvert={Boolean(tenue)} onFermer={onFermer} titre={tenue ? `Modifier « ${tenue.nom} »` : ""}>
      {tenue && <FormulaireModification key={tenue.id} tenue={tenue} atelier={atelier} onFermer={onFermer} onEnregistre={onEnregistre} />}
    </Dialogue>
  );
}

function FormulaireModification({
  tenue,
  atelier,
  onFermer,
  onEnregistre,
}: {
  tenue: Tenue;
  atelier: Atelier;
  onFermer: () => void;
  onEnregistre: (t: Tenue) => void;
}) {
  const { collections, tenues, photographier, montrer } = atelier;
  const [nom, setNom] = useState(tenue.nom);
  const [collectionId, setCollectionId] = useState(tenue.collection_id);
  const [gabarit, setGabarit] = useState<Gabarit>(tenue.gabarit);
  const [details, setDetails] = useState(tenue.details);
  const [note, setNote] = useState(tenue.note);
  const [creeePour, setCreeePour] = useState(tenue.creee_pour);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;
    setOccupe(true);
    setErreur("");
    try {
      // Le slug est conservé : les liens partagés restent valides.
      const modifs: Partial<Tenue> = {
        nom: nom.trim(),
        details: details.trim(),
        note: note.trim(),
        creee_pour: creeePour.trim(),
      };
      if (collectionId !== tenue.collection_id) {
        modifs.collection_id = collectionId;
        modifs.ordre = tenues.filter((t) => t.collection_id === collectionId).reduce((m, t) => Math.max(m, t.ordre), -1) + 1;
      }
      let maj: Tenue;
      if (gabarit !== tenue.gabarit) {
        const image = await imageSkin(tenue.skin_path);
        maj = await regenererImages(tenue, image, gabarit, photographier, modifs);
        montrer(image, gabarit, maj.nom);
      } else {
        maj = await modifierTenue(tenue.id, modifs);
      }
      onEnregistre(maj);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <form className="formulaire" onSubmit={enregistrer}>
      <label className="champ">
        <span>Nom</span>
        <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={80} />
      </label>
      <label className="champ">
        <span>Collection</span>
        <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titre}
            </option>
          ))}
        </select>
      </label>
      <ChoixGabarit valeur={gabarit} onChange={setGabarit} />
      {gabarit !== tenue.gabarit && <p className="legende">Les images de la tenue seront regénérées.</p>}
      <label className="champ">
        <span>Détails</span>
        <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={600} />
      </label>
      <label className="champ">
        <span>Le mot de la créatrice</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1200} />
      </label>
      <label className="champ">
        <span>Créée pour</span>
        <input value={creeePour} onChange={(e) => setCreeePour(e.target.value)} maxLength={120} />
      </label>
      <p className="legende">Adresse conservée : /lookbook/{tenue.slug}</p>
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      <div className="dialogue__actions">
        <button type="button" className="bouton bouton--discret" onClick={onFermer}>
          Annuler
        </button>
        <button type="submit" className="bouton bouton--principal" disabled={occupe || !nom.trim()}>
          {occupe ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function RemplacerSkin({
  tenue,
  atelier,
  onFermer,
  onEnregistre,
}: {
  tenue: Tenue | null;
  atelier: Atelier;
  onFermer: () => void;
  onEnregistre: (t: Tenue) => void;
}) {
  return (
    <Dialogue ouvert={Boolean(tenue)} onFermer={onFermer} titre={tenue ? `Remplacer le PNG de « ${tenue.nom} »` : ""}>
      {tenue && <FormulaireRemplacement key={tenue.id} tenue={tenue} atelier={atelier} onFermer={onFermer} onEnregistre={onEnregistre} />}
    </Dialogue>
  );
}

function FormulaireRemplacement({
  tenue,
  atelier,
  onFermer,
  onEnregistre,
}: {
  tenue: Tenue;
  atelier: Atelier;
  onFermer: () => void;
  onEnregistre: (t: Tenue) => void;
}) {
  const { photographier, montrer } = atelier;
  const [analyse, setAnalyse] = useState<AnalyseSkin | null>(null);
  const [gabarit, setGabarit] = useState<Gabarit>(tenue.gabarit);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  const recevoir = async (f: File) => {
    setErreur("");
    const a = await analyserFichier(f);
    setAnalyse(a);
    setGabarit(a.gabarit);
    if (a.image) montrer(a.image, a.gabarit, `${tenue.nom} (nouveau fichier)`);
  };

  const remplacer = async () => {
    if (!analyse?.image) return;
    setOccupe(true);
    setErreur("");
    try {
      const maj = await remplacerSkin(tenue, analyse.fichier, analyse.image, gabarit, photographier);
      montrer(analyse.image, gabarit, maj.nom);
      onEnregistre(maj);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="formulaire">
      <DepotSkin onFichier={(f) => void recevoir(f)} compact />
      {analyse && <ListeVerifications resultat={analyse.resultat} />}
      {analyse?.image && (
        <ChoixGabarit
          valeur={gabarit}
          detecte={analyse.gabarit}
          onChange={(g) => {
            setGabarit(g);
            montrer(analyse.image, g, `${tenue.nom} (nouveau fichier)`);
          }}
        />
      )}
      {erreur && (
        <p className="message message--erreur" role="alert">
          {erreur}
        </p>
      )}
      <div className="dialogue__actions">
        <button type="button" className="bouton bouton--discret" onClick={onFermer}>
          Annuler
        </button>
        <button type="button" className="bouton bouton--principal" disabled={!analyse?.image || occupe} onClick={() => void remplacer()}>
          {occupe ? "Remplacement…" : "Remplacer le fichier"}
        </button>
      </div>
    </div>
  );
}
