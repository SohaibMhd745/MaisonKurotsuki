"use client";

import { useEffect, useRef, useState } from "react";
import { Embleme } from "@/components/Embleme";
import { dateLongue } from "@/lib/dates";
import { supabaseNavigateur } from "@/lib/supabase/client";
import type { Lettre, Role } from "@/lib/types";

/** La lettre de bienvenue, en grand, avant tout le reste. */
export function LettreBienvenue({ lettre, onRanger }: { lettre: Lettre; onRanger: () => void }) {
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    bouton.current?.focus({ preventScroll: true });
    const touche = (e: KeyboardEvent) => e.key === "Escape" && onRanger();
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onRanger]);

  return (
    <div className="lettre-voile" role="dialog" aria-modal="true" aria-labelledby="lettre-titre">
      <article className="lettre">
        <Embleme className="lettre__embleme" />
        <h2 id="lettre-titre" className="visuellement-cache">
          Une lettre pour toi
        </h2>
        <div className="lettre__texte">
          {lettre.texte.split(/\n{2,}/).map((paragraphe, i) => (
            <p key={i}>{paragraphe}</p>
          ))}
        </div>
        {lettre.signature && <p className="lettre__signature">{lettre.signature}</p>}
        <button ref={bouton} type="button" className="bouton bouton--principal lettre__ranger" onClick={onRanger}>
          Ranger la lettre
        </button>
      </article>
    </div>
  );
}

export function LettreOnglet({
  role,
  lettre,
  onChange,
  onRelire,
}: {
  role: Role;
  lettre: Lettre | null;
  onChange: (l: Lettre) => void;
  onRelire: () => void;
}) {
  if (role === "creatrice") {
    return (
      <section className="section-coulisses">
        <h2 className="titre-2">La lettre</h2>
        {lettre?.texte.trim() ? (
          <>
            <p className="texte-doux">Une lettre t&apos;attend, à relire quand tu veux.</p>
            <button type="button" className="bouton bouton--principal" onClick={onRelire}>
              Relire la lettre
            </button>
          </>
        ) : (
          <p className="texte-doux">Aucune lettre pour le moment.</p>
        )}
      </section>
    );
  }
  return <EditeurLettre lettre={lettre} onChange={onChange} onRelire={onRelire} />;
}

function EditeurLettre({
  lettre,
  onChange,
  onRelire,
}: {
  lettre: Lettre | null;
  onChange: (l: Lettre) => void;
  onRelire: () => void;
}) {
  const [texte, setTexte] = useState(lettre?.texte ?? "");
  const [signature, setSignature] = useState(lettre?.signature ?? "");
  const [etat, setEtat] = useState<"" | "enregistrement" | "enregistre" | "erreur">("");
  const modifie = texte !== (lettre?.texte ?? "") || signature !== (lettre?.signature ?? "");

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setEtat("enregistrement");
    const { data, error } = await supabaseNavigateur()
      .from("lettre")
      .update({ texte, signature })
      .eq("id", 1)
      .select("*")
      .single();
    if (error || !data) {
      setEtat("erreur");
      return;
    }
    onChange(data as Lettre);
    setEtat("enregistre");
  };

  return (
    <section className="section-coulisses">
      <h2 className="titre-2">La lettre</h2>
      <p className="texte-doux">
        Elle s&apos;affiche en grand à la première visite de la créatrice dans les Coulisses.{" "}
        {lettre?.lue_le ? `Lue le ${dateLongue(lettre.lue_le)}.` : "Pas encore lue."}
      </p>
      <form className="formulaire" onSubmit={enregistrer}>
        <label className="champ">
          <span>Texte</span>
          <textarea
            rows={14}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              setEtat("");
            }}
            placeholder="Une ligne vide sépare deux paragraphes."
          />
        </label>
        <label className="champ">
          <span>Signature</span>
          <input
            value={signature}
            maxLength={120}
            onChange={(e) => {
              setSignature(e.target.value);
              setEtat("");
            }}
          />
        </label>
        <div className="formulaire__actions">
          <button type="submit" className="bouton bouton--principal" disabled={!modifie || etat === "enregistrement"}>
            Enregistrer la lettre
          </button>
          <button type="button" className="bouton bouton--discret" onClick={onRelire} disabled={!lettre?.texte.trim() || modifie}>
            Aperçu
          </button>
          <span className="legende" role="status">
            {etat === "enregistrement" && "Enregistrement…"}
            {etat === "enregistre" && "Enregistré"}
            {etat === "erreur" && "La lettre n'a pas pu être enregistrée."}
          </span>
        </div>
      </form>
    </section>
  );
}
