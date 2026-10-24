"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Confirmation, Dialogue } from "@/components/Dialogue";
import { useMembre } from "@/hooks/useMembre";
import { revalider, revaliderPlusTard } from "@/lib/atelier";
import { slugifier } from "@/lib/slug";
import { supabaseConfigure } from "@/lib/supabase/config";
import { supabaseNavigateur } from "@/lib/supabase/client";
import {
  contenuSur,
  nouvelId,
  PALETTE_RANGS,
  reserve as calculerReserve,
  reunir,
  separer,
  tenuesConcernees,
} from "@/lib/tierlist";
import type { Collection, ContenuTierList, Rang, Tenue, TierList } from "@/lib/types";
import { ApercuTenue } from "./ApercuTenue";
import { ChoixCollections } from "./ChoixCollections";
import { ExportTierList } from "./ExportTierList";
import { idRang, RangeeTier, Reserve, RESERVE, VignetteSurvol } from "./Rangees";
import { ReglagesRang } from "./ReglagesRang";

const DELAI_ENREGISTREMENT = 500;

type Statut = "enregistre" | "modifie" | "enregistrement" | "erreur";

interface Props {
  initiale: TierList;
  tenuesInitiales: Tenue[];
  collections: Collection[];
}

const conteneurDe = (id: string) => (id.startsWith("zone:") ? id.slice(5) : id.startsWith("rang:") ? id.slice(5) : null);

export function EditeurTierList({ initiale, tenuesInitiales, collections }: Props) {
  const router = useRouter();
  const { role } = useMembre();
  const editable = Boolean(role);
  const id = initiale.id;

  const [tenues, setTenues] = useState(tenuesInitiales);
  const [titre, setTitre] = useState(initiale.titre);
  const [portee, setPortee] = useState<string[]>(initiale.collections ?? []);
  const absentes = useRef(new Map<string, string[]>());
  const [contenu, setContenu] = useState<ContenuTierList>(() => {
    const visibles = new Set(tenuesConcernees(initiale, tenuesInitiales).map((t) => t.id));
    const { contenu: c, absentes: a } = separer(contenuSur(initiale.contenu), visibles);
    absentes.current = a;
    return c;
  });
  const version = useRef(initiale.version);
  const dernierTitre = useRef(initiale.titre);

  const [statut, setStatut] = useState<Statut>("enregistre");
  const [avis, setAvis] = useState<string | null>(null);
  const [supprime, setSupprime] = useState(false);
  const [compteur, setCompteur] = useState(0);
  const sale = useRef(false);
  const enCours = useRef(false);

  const [actif, setActif] = useState<{ type: "tenue" | "rang"; id: string } | null>(null);
  const instantane = useRef<ContenuTierList | null>(null);
  const finGlisse = useRef(0);

  const [apercu, setApercu] = useState<Tenue | null>(null);
  const [reglages, setReglages] = useState<string | null>(null);
  const [choixPortee, setChoixPortee] = useState(false);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [presentation, setPresentation] = useState(false);
  const [reserveRepliee, setReserveRepliee] = useState(false);
  const [exportEnCours, setExportEnCours] = useState(false);
  const racine = useRef<HTMLDivElement>(null);
  const zoneExport = useRef<HTMLDivElement>(null);

  const parId = useMemo(() => new Map(tenues.map((t) => [t.id, t])), [tenues]);
  const concernees = useMemo(() => tenuesConcernees({ collections: portee }, tenues), [portee, tenues]);
  const enReserve = useMemo(() => calculerReserve(contenu, concernees), [contenu, concernees]);
  const collectionsParId = useMemo(() => new Map(collections.map((c) => [c.id, c])), [collections]);

  // État courant lu par l'enregistrement différé.
  const etat = useRef({ titre, portee, contenu });
  etat.current = { titre, portee, contenu };

  /** Applique une version reçue de la base. */
  const appliquer = useCallback((tl: TierList, liste: Tenue[]) => {
    const visibles = new Set(tenuesConcernees(tl, liste).map((t) => t.id));
    const { contenu: c, absentes: a } = separer(contenuSur(tl.contenu), visibles);
    absentes.current = a;
    version.current = tl.version;
    dernierTitre.current = tl.titre;
    setTitre(tl.titre);
    setPortee(tl.collections ?? []);
    setContenu(c);
    sale.current = false;
    setStatut("enregistre");
  }, []);

  const listeTenues = useRef(tenues);
  listeTenues.current = tenues;

  const recharger = useCallback(
    async (message: string | null) => {
      const { data } = await supabaseNavigateur().from("tier_lists").select("*").eq("id", id).maybeSingle();
      if (!data) {
        setSupprime(true);
        return;
      }
      appliquer(data as TierList, listeTenues.current);
      if (message) setAvis(message);
    },
    [id, appliquer],
  );

  // Données fraîches à l'ouverture : la page est pré-générée.
  useEffect(() => {
    if (!supabaseConfigure) return;
    const sb = supabaseNavigateur();
    let vivant = true;
    void (async () => {
      const [{ data: tl }, { data: liste }] = await Promise.all([
        sb.from("tier_lists").select("*").eq("id", id).maybeSingle(),
        sb.from("tenues").select("*").eq("statut", "publiee").order("publiee_le", { ascending: false }),
      ]);
      if (!vivant) return;
      const nouvelles = (liste as Tenue[] | null) ?? listeTenues.current;
      setTenues(nouvelles);
      if (!tl) setSupprime(true);
      else if (!sale.current) appliquer(tl as TierList, nouvelles);
    })();
    return () => {
      vivant = false;
    };
  }, [id, appliquer]);

  // Synchronisation en direct : un second écran se met à jour seul.
  useEffect(() => {
    if (!supabaseConfigure) return;
    const sb = supabaseNavigateur();
    const canal = sb
      .channel(`tier-list-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tier_lists", filter: `id=eq.${id}` }, (charge) => {
        const recue = charge.new as TierList;
        if (!recue || recue.version <= version.current) return;
        if (sale.current || enCours.current) {
          void recharger("L'autre membre a modifié ce classement en même temps que vous. Sa version a été rechargée.");
        } else {
          appliquer(recue, listeTenues.current);
        }
      })
      .subscribe();
    return () => {
      void sb.removeChannel(canal);
    };
  }, [id, appliquer, recharger]);

  const marquer = useCallback(() => {
    sale.current = true;
    setStatut("modifie");
    setCompteur((n) => n + 1);
  }, []);

  const enregistrer = useCallback(async (): Promise<void> => {
    if (enCours.current) return;
    enCours.current = true;
    sale.current = false;
    setStatut("enregistrement");
    const { titre: t, portee: p, contenu: c } = etat.current;
    const titreValide = t.trim() || dernierTitre.current;
    const attendue = version.current;
    const { data, error } = await supabaseNavigateur()
      .from("tier_lists")
      .update({ titre: titreValide, collections: p, contenu: reunir(c, absentes.current), version: attendue + 1 })
      .eq("id", id)
      .eq("version", attendue)
      .select("version")
      .maybeSingle();
    enCours.current = false;

    if (error) {
      sale.current = true;
      setStatut("erreur");
      return;
    }
    if (!data) {
      // Quelqu'un a enregistré entre-temps : on prévient et on recharge plutôt que d'écraser.
      await recharger("L'autre membre a modifié ce classement entre-temps. Sa version a été rechargée pour ne pas écraser son travail.");
      return;
    }
    version.current = data.version;
    dernierTitre.current = titreValide;
    revaliderPlusTard();
    if (sale.current) setCompteur((n) => n + 1);
    else setStatut("enregistre");
  }, [id, recharger]);

  // Enregistrement automatique 0,5 s après chaque modification (jamais pendant un glisser).
  useEffect(() => {
    if (!sale.current || actif || !editable) return;
    const minuterie = window.setTimeout(() => void enregistrer(), DELAI_ENREGISTREMENT);
    return () => window.clearTimeout(minuterie);
  }, [compteur, actif, editable, enregistrer]);

  useEffect(() => {
    if (statut !== "erreur") return;
    const relance = window.setTimeout(() => setCompteur((n) => n + 1), 4000);
    return () => window.clearTimeout(relance);
  }, [statut]);

  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => {
      if (sale.current || enCours.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, []);

  // ── Modifications ────────────────────────────────────────────────────

  const modifierContenu = (f: (c: ContenuTierList) => ContenuTierList) => {
    setContenu(f);
    marquer();
  };

  const modifierRang = (rangId: string, modifs: Partial<Pick<Rang, "nom" | "couleur">>) =>
    modifierContenu((c) => ({ rangs: c.rangs.map((r) => (r.id === rangId ? { ...r, ...modifs } : r)) }));

  const ajouterRang = (apres?: string) =>
    modifierContenu((c) => {
      const nouveau: Rang = {
        id: nouvelId(),
        nom: "Nouveau",
        couleur: PALETTE_RANGS[c.rangs.length % PALETTE_RANGS.length],
        tenues: [],
      };
      const i = apres ? c.rangs.findIndex((r) => r.id === apres) + 1 : c.rangs.length;
      const rangs = [...c.rangs];
      rangs.splice(i, 0, nouveau);
      return { rangs };
    });

  const supprimerRang = (rangId: string) => {
    absentes.current.delete(rangId);
    modifierContenu((c) => (c.rangs.length <= 1 ? c : { rangs: c.rangs.filter((r) => r.id !== rangId) }));
  };

  const changerPortee = (ids: string[]) => {
    const complet = reunir(contenu, absentes.current);
    const visibles = new Set(tenuesConcernees({ collections: ids }, tenues).map((t) => t.id));
    const { contenu: c, absentes: a } = separer(complet, visibles);
    absentes.current = a;
    setPortee(ids);
    setContenu(c);
    marquer();
  };

  // ── Glisser-déposer ──────────────────────────────────────────────────

  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const trouverConteneur = useCallback(
    (cle: string): string | null => {
      const direct = conteneurDe(cle);
      if (direct) return direct;
      const rang = contenu.rangs.find((r) => r.tenues.includes(cle));
      if (rang) return rang.id;
      return enReserve.some((t) => t.id === cle) ? RESERVE : null;
    },
    [contenu, enReserve],
  );

  const collisions: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === "rang") {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith("rang:")),
      });
    }
    const candidats = args.droppableContainers.filter((c) => !String(c.id).startsWith("rang:"));
    const dessous = pointerWithin({ ...args, droppableContainers: candidats });
    if (dessous.length) {
      const tenue = dessous.find((c) => !String(c.id).startsWith("zone:"));
      return tenue ? [tenue] : dessous;
    }
    return closestCenter({ ...args, droppableContainers: candidats });
  }, []);

  const debut = ({ active }: DragStartEvent) => {
    instantane.current = contenu;
    setActif({ type: active.data.current?.type === "rang" ? "rang" : "tenue", id: String(active.id) });
  };

  const survol = ({ active, over }: DragOverEvent) => {
    if (!over || active.data.current?.type === "rang") return;
    const cle = String(active.id);
    const de = trouverConteneur(cle);
    const vers = trouverConteneur(String(over.id));
    if (!de || !vers || de === vers) return;
    setContenu((c) => {
      const rangs = c.rangs.map((r) => {
        if (r.id === de) return { ...r, tenues: r.tenues.filter((t) => t !== cle) };
        if (r.id === vers) {
          const sans = r.tenues.filter((t) => t !== cle);
          const i = sans.indexOf(String(over.id));
          sans.splice(i >= 0 ? i : sans.length, 0, cle);
          return { ...r, tenues: sans };
        }
        return r;
      });
      return { rangs };
    });
  };

  const fin = ({ active, over }: DragEndEvent) => {
    setActif(null);
    finGlisse.current = Date.now();
    let suivant = contenu;
    if (over && active.data.current?.type === "rang") {
      const de = contenu.rangs.findIndex((r) => idRang(r.id) === active.id);
      const vers = contenu.rangs.findIndex((r) => idRang(r.id) === over.id);
      if (de >= 0 && vers >= 0 && de !== vers) suivant = { rangs: arrayMove(contenu.rangs, de, vers) };
    } else if (over) {
      const cle = String(active.id);
      const conteneur = trouverConteneur(cle);
      if (conteneur && conteneur !== RESERVE && conteneur === trouverConteneur(String(over.id))) {
        suivant = {
          rangs: contenu.rangs.map((r) => {
            if (r.id !== conteneur) return r;
            const de = r.tenues.indexOf(cle);
            const vers = r.tenues.indexOf(String(over.id));
            return de >= 0 && vers >= 0 && de !== vers ? { ...r, tenues: arrayMove(r.tenues, de, vers) } : r;
          }),
        };
      }
    } else if (instantane.current) {
      suivant = instantane.current;
    }
    setContenu(suivant);
    if (JSON.stringify(instantane.current) !== JSON.stringify(suivant)) marquer();
  };

  const annule = () => {
    setActif(null);
    if (instantane.current) setContenu(instantane.current);
  };

  const nomDe = useCallback(
    (cle: string | number) => {
      const s = String(cle);
      if (s.startsWith("rang:")) return `le rang ${contenu.rangs.find((r) => idRang(r.id) === s)?.nom ?? ""}`;
      if (s.startsWith("zone:")) {
        const c = s.slice(5);
        return c === RESERVE ? "la réserve" : `le rang ${contenu.rangs.find((r) => r.id === c)?.nom ?? ""}`;
      }
      return parId.get(s)?.nom ?? "la tenue";
    },
    [contenu, parId],
  );

  const annonces: Announcements = {
    onDragStart: ({ active }) => `${nomDe(active.id)} est saisie.`,
    onDragOver: ({ active, over }) => (over ? `${nomDe(active.id)} survole ${nomDe(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${nomDe(active.id)} est déposée près de ${nomDe(over.id)}.` : `${nomDe(active.id)} est reposée.`),
    onDragCancel: ({ active }) => `Déplacement annulé : ${nomDe(active.id)} revient à sa place.`,
  };

  const ouvrir = (t: Tenue) => {
    if (Date.now() - finGlisse.current < 250) return;
    setApercu(t);
  };

  // ── Mode présentation ────────────────────────────────────────────────

  useEffect(() => {
    const suivre = () => {
      if (!document.fullscreenElement) setPresentation(false);
    };
    document.addEventListener("fullscreenchange", suivre);
    return () => document.removeEventListener("fullscreenchange", suivre);
  }, []);

  useEffect(() => {
    if (!presentation) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.fullscreenElement && !document.querySelector("dialog[open]")) {
        setPresentation(false);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [presentation]);

  const entrerPresentation = () => {
    setPresentation(true);
    setReserveRepliee(true);
    void racine.current?.requestFullscreen?.().catch(() => {});
  };
  const quitterPresentation = () => {
    setPresentation(false);
    if (document.fullscreenElement) void document.exitFullscreen();
  };

  // ── Actions ──────────────────────────────────────────────────────────

  const exporter = async () => {
    setExportEnCours(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const noeud = zoneExport.current;
      if (!noeud) return;
      await Promise.all(
        Array.from(noeud.querySelectorAll("img")).map((img) => (img.complete ? null : img.decode().catch(() => null))),
      );
      const { toPng } = await import("html-to-image");
      const fond = getComputedStyle(document.body).backgroundColor;
      const donnees = await toPng(noeud, { pixelRatio: 1, backgroundColor: fond, cacheBust: true });
      const lien = document.createElement("a");
      lien.href = donnees;
      lien.download = `${slugifier(titre || "classement")}.png`;
      lien.click();
    } catch {
      setAvis("L'export en image a échoué. Réessayez dans un instant.");
    } finally {
      setExportEnCours(false);
    }
  };

  const dupliquer = async () => {
    const { data, error } = await supabaseNavigateur()
      .from("tier_lists")
      .insert({ titre: `${titre.trim() || dernierTitre.current} (copie)`, collections: portee, contenu: reunir(contenu, absentes.current) })
      .select("id")
      .single();
    if (error || !data) {
      setAvis("Le classement n'a pas pu être dupliqué.");
      return;
    }
    void revalider();
    router.push(`/jury/${data.id}`);
  };

  const supprimer = async () => {
    const { error } = await supabaseNavigateur().from("tier_lists").delete().eq("id", id);
    if (error) {
      setAvis("Le classement n'a pas pu être supprimé.");
      setConfirmerSuppression(false);
      return;
    }
    sale.current = false;
    await revalider();
    router.push("/jury");
    router.refresh();
  };

  if (supprime) {
    return (
      <div className="page vide">
        <p className="sous-titre">Ce classement a été supprimé.</p>
        <button type="button" className="bouton" onClick={() => router.push("/jury")}>
          Retour au Jury
        </button>
      </div>
    );
  }

  const rangReglages = contenu.rangs.find((r) => r.id === reglages) ?? null;
  const tenueActive = actif?.type === "tenue" ? parId.get(actif.id) : undefined;
  const rangActif = actif?.type === "rang" ? contenu.rangs.find((r) => idRang(r.id) === actif.id) : undefined;
  const libelleStatut: Record<Statut, string> = {
    enregistre: "Enregistré",
    modifie: "Modifié",
    enregistrement: "Enregistrement…",
    erreur: "Hors ligne : nouvel essai bientôt",
  };

  return (
    <div ref={racine} className={`tier page ${presentation ? "tier--presentation" : ""}`}>
      <header className="tier__entete">
        <div className="tier__titre">
          <p className="legende tier__surtitre">Le Jury</p>
          {editable && !presentation ? (
            <input
              className="titre-1 tier__titre-champ"
              value={titre}
              maxLength={120}
              aria-label="Titre du classement"
              onChange={(e) => {
                setTitre(e.target.value);
                marquer();
              }}
            />
          ) : (
            <h1 className="titre-1">{titre}</h1>
          )}
        </div>
        <div className="tier__outils">
          {editable && !presentation && (
            <span className={`tier__statut tier__statut--${statut}`} role="status">
              {libelleStatut[statut]}
            </span>
          )}
          {presentation ? (
            <>
              <button type="button" className="bouton bouton--discret" onClick={() => setReserveRepliee((v) => !v)}>
                {reserveRepliee ? "Afficher la réserve" : "Replier la réserve"}
              </button>
              <button type="button" className="bouton" onClick={quitterPresentation}>
                Quitter (Échap)
              </button>
            </>
          ) : (
            <>
              <button type="button" className="bouton" onClick={entrerPresentation}>
                Mode présentation
              </button>
              <button type="button" className="bouton bouton--discret" onClick={exporter} disabled={exportEnCours}>
                {exportEnCours ? "Export…" : "Exporter en image"}
              </button>
              {editable && (
                <details className="menu">
                  <summary className="bouton bouton--discret">Plus</summary>
                  <div className="menu__liste">
                    <button type="button" onClick={() => setChoixPortee(true)}>
                      Tenues concernées…
                    </button>
                    <button type="button" onClick={dupliquer}>
                      Dupliquer
                    </button>
                    <button type="button" className="menu__danger" onClick={() => setConfirmerSuppression(true)}>
                      Supprimer…
                    </button>
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      </header>

      {avis && (
        <div className="message message--alerte tier__avis" role="alert">
          <p>{avis}</p>
          <button type="button" className="bouton-icone" onClick={() => setAvis(null)} aria-label="Fermer le message">
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      <DndContext
        sensors={capteurs}
        collisionDetection={collisions}
        onDragStart={debut}
        onDragOver={survol}
        onDragEnd={fin}
        onDragCancel={annule}
        accessibility={{
          announcements: annonces,
          screenReaderInstructions: {
            draggable:
              "Pour déplacer une tenue, appuyez sur Espace, utilisez les flèches, puis Espace pour la déposer ou Échap pour annuler.",
          },
        }}
      >
        <SortableContext items={contenu.rangs.map((r) => idRang(r.id))} strategy={verticalListSortingStrategy}>
          <ol className="tier__rangs">
            {contenu.rangs.map((r) => (
              <RangeeTier
                key={r.id}
                rang={r}
                tenues={r.tenues.map((t) => parId.get(t)).filter((t): t is Tenue => Boolean(t))}
                editable={editable && !presentation}
                onOuvrir={ouvrir}
                onReglages={(rang) => setReglages(rang.id)}
              />
            ))}
          </ol>
        </SortableContext>

        {editable && !presentation && (
          <button type="button" className="bouton bouton--discret tier__ajouter" onClick={() => ajouterRang()}>
            Ajouter un rang
          </button>
        )}

        {!(presentation && reserveRepliee) && (
          <section className="reserve" aria-labelledby="reserve-titre">
            <h2 id="reserve-titre" className="legende">
              La réserve · {enReserve.length} {enReserve.length > 1 ? "tenues" : "tenue"}
            </h2>
            <Reserve tenues={enReserve} editable={editable && !presentation} onOuvrir={ouvrir} />
          </section>
        )}

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" }}>
          {tenueActive ? <VignetteSurvol tenue={tenueActive} /> : null}
          {rangActif ? (
            <div className="rang rang--survol">
              <span className="rang__nom">{rangActif.nom}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ApercuTenue
        tenue={apercu}
        collection={apercu ? collectionsParId.get(apercu.collection_id) : undefined}
        onFermer={() => setApercu(null)}
      />

      <ReglagesRang
        rang={rangReglages}
        seul={contenu.rangs.length <= 1}
        onFermer={() => setReglages(null)}
        onModifier={modifierRang}
        onAjouterApres={ajouterRang}
        onSupprimer={supprimerRang}
      />

      <Dialogue ouvert={choixPortee} onFermer={() => setChoixPortee(false)} titre="Tenues concernées">
        <div className="formulaire">
          <ChoixCollections collections={collections} valeur={portee} onChange={changerPortee} />
          <p className="legende">
            Les tenues retirées du classement sont mises de côté : elles reviennent à leur place si leur collection est
            de nouveau choisie.
          </p>
          <div className="dialogue__actions">
            <button type="button" className="bouton bouton--principal" onClick={() => setChoixPortee(false)}>
              Terminé
            </button>
          </div>
        </div>
      </Dialogue>

      <Confirmation
        ouvert={confirmerSuppression}
        titre="Supprimer ce classement ?"
        message={<p>« {titre} » sera supprimé définitivement, pour vous deux.</p>}
        action="Supprimer"
        onConfirmer={supprimer}
        onAnnuler={() => setConfirmerSuppression(false)}
      />

      {exportEnCours && <ExportTierList ref={zoneExport} titre={titre} rangs={contenu.rangs} parId={parId} />}

    </div>
  );
}
