"use client";

import Link from "next/link";
import { useState } from "react";
import type { Gabarit, Statut, Tenue } from "@/lib/types";
import type { Atelier } from "./Coulisses";
import { ChoixGabarit, DepotSkin, ListeVerifications } from "./Depot";
import { analyserFichier, type AnalyseSkin } from "./fichierSkin";
import { creerCollection, creerTenue, messageErreur } from "./operations";

const NOUVELLE = "__nouvelle__";

export function NouvelleTenue({ atelier, onVoirTenues }: { atelier: Atelier; onVoirTenues: () => void }) {
  const { collections, tenues, setTenues, setCollections, montrer, photographier } = atelier;
  const [analyse, setAnalyse] = useState<AnalyseSkin | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [gabarit, setGabarit] = useState<Gabarit>("classic");
  const [nom, setNom] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? NOUVELLE);
  const [nouvelleCollection, setNouvelleCollection] = useState("");
  const [visibilite, setVisibilite] = useState<"publiee" | "masquee">("publiee");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState("");
  const [creeePour, setCreeePour] = useState("");
  const [occupe, setOccupe] = useState<Statut | null>(null);
  const [erreur, setErreur] = useState("");
  const [celebration, setCelebration] = useState<Tenue | null>(null);

  const recevoir = async (fichier: File) => {
    setErreur("");
    setAnalyseEnCours(true);
    const resultat = await analyserFichier(fichier);
    setAnalyse(resultat);
    setAnalyseEnCours(false);
    setGabarit(resultat.gabarit);
    montrer(resultat.image, resultat.gabarit, resultat.image ? nom || "Nouvelle tenue" : undefined);
    if (!nom && resultat.image) {
      const base = fichier.name.replace(/\.png$/i, "").replace(/[_-]+/g, " ").trim();
      if (base && !/^skin$/i.test(base)) setNom(base.charAt(0).toUpperCase() + base.slice(1));
    }
  };

  const changerGabarit = (g: Gabarit) => {
    setGabarit(g);
    if (analyse?.image) montrer(analyse.image, g, nom || "Nouvelle tenue");
  };

  const pret =
    Boolean(analyse?.image) &&
    nom.trim().length > 0 &&
    (collectionId !== NOUVELLE || nouvelleCollection.trim().length > 0);

  const ajouter = async (statut: Statut) => {
    if (!analyse?.image || !pret) return;
    setOccupe(statut);
    setErreur("");
    try {
      let idCollection = collectionId;
      if (collectionId === NOUVELLE) {
        const c = await creerCollection(nouvelleCollection, "", collections);
        setCollections((cs) => [...cs, c]);
        setCollectionId(c.id);
        idCollection = c.id;
      }
      const tenue = await creerTenue({
        fichier: analyse.fichier,
        image: analyse.image,
        gabarit,
        champs: { nom, details, note, creee_pour: creeePour },
        statut,
        collectionId: idCollection,
        tenues,
        photographier,
      });
      setTenues((ts) => [tenue, ...ts]);
      setCelebration(tenue);
      setAnalyse(null);
      setNom("");
      setDetails("");
      setNote("");
      setCreeePour("");
      setNouvelleCollection("");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setOccupe(null);
    }
  };

  if (celebration) {
    const publiee = celebration.statut === "publiee";
    return (
      <section className="celebration" role="status">
        <p className="legende">{publiee ? "Elle a rejoint la garde-robe" : "Elle attend en coulisses"}</p>
        <h2 className="titre-1 celebration__nom">{celebration.nom}</h2>
        <div className="ornement" aria-hidden />
        <p className="texte-doux">
          {publiee
            ? "La tenue est maintenant visible dans la garde-robe et le lookbook."
            : celebration.statut === "brouillon"
              ? "La tenue est gardée en brouillon : elle n'est visible que dans les Coulisses."
              : "La tenue est masquée : elle n'est visible que dans les Coulisses."}
        </p>
        <div className="celebration__actions">
          {publiee && (
            <Link href={`/lookbook/${celebration.slug}`} className="bouton bouton--principal">
              La voir dans le lookbook
            </Link>
          )}
          <button type="button" className="bouton" onClick={() => setCelebration(null)}>
            Ajouter une autre tenue
          </button>
          <button type="button" className="bouton bouton--discret" onClick={onVoirTenues}>
            Mes tenues
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="section-coulisses nouvelle-tenue">
      <h2 className="titre-2">Nouvelle tenue</h2>

      <DepotSkin onFichier={recevoir} compact={Boolean(analyse)} />
      {analyseEnCours && <p className="legende">Vérification du fichier…</p>}
      {analyse && (
        <div className="nouvelle-tenue__fichier">
          <p className="legende">{analyse.fichier.name}</p>
          <ListeVerifications resultat={analyse.resultat} />
        </div>
      )}

      {analyse?.image && (
        <form
          className="formulaire"
          onSubmit={(e) => {
            e.preventDefault();
            void ajouter(visibilite);
          }}
        >
          <ChoixGabarit valeur={gabarit} detecte={analyse.gabarit} onChange={changerGabarit} />

          <label className="champ">
            <span>Nom de la tenue</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={80} placeholder="Rosée noire" />
          </label>

          <label className="champ">
            <span>Collection</span>
            <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)} required>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titre}
                </option>
              ))}
              <option value={NOUVELLE}>Ouvrir une nouvelle collection…</option>
            </select>
          </label>
          {collectionId === NOUVELLE && (
            <label className="champ">
              <span>Nom de la nouvelle collection</span>
              <input
                value={nouvelleCollection}
                onChange={(e) => setNouvelleCollection(e.target.value)}
                required
                maxLength={80}
                placeholder="Deuil de soie"
              />
            </label>
          )}

          <fieldset className="champ-groupe">
            <legend>Visibilité</legend>
            <div className="segmente">
              <label className="segmente__option">
                <input type="radio" checked={visibilite === "publiee"} onChange={() => setVisibilite("publiee")} />
                <span>Visible de tous</span>
              </label>
              <label className="segmente__option">
                <input type="radio" checked={visibilite === "masquee"} onChange={() => setVisibilite("masquee")} />
                <span>Masquée</span>
              </label>
            </div>
          </fieldset>

          <details className="replie">
            <summary>Détails, mot de la créatrice… (facultatif)</summary>
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
          </details>

          {erreur && (
            <p className="message message--erreur" role="alert">
              {erreur}
            </p>
          )}

          <div className="formulaire__actions">
            <button type="submit" className="bouton bouton--principal" disabled={!pret || Boolean(occupe)}>
              {occupe && occupe !== "brouillon" ? "Ajout en cours…" : "Ajouter à la garde-robe"}
            </button>
            <button
              type="button"
              className="bouton"
              disabled={!pret || Boolean(occupe)}
              onClick={() => void ajouter("brouillon")}
            >
              {occupe === "brouillon" ? "Enregistrement…" : "Garder en brouillon"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
