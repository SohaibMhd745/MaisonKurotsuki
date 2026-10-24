import type { Metadata } from "next";
import Link from "next/link";
import { NouveauClassement } from "@/components/jury/NouveauClassement";
import { ImageTenue } from "@/components/Portrait";
import { collectionsPubliques, tenuesPubliees, tierLists } from "@/lib/donnees";
import { dateLongue } from "@/lib/dates";
import { contenuSur, couleurCss } from "@/lib/tierlist";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = { title: "Le Jury" };

export default async function PageJury() {
  const [listes, tenues, collections] = await Promise.all([tierLists(), tenuesPubliees(), collectionsPubliques()]);
  const parId = new Map(tenues.map((t) => [t.id, t]));

  return (
    <div className="page jury">
      <header className="page__entete page__entete--actions">
        <div>
          <p className="legende">Les classements</p>
          <h1 className="titre-1">Le Jury</h1>
        </div>
        <NouveauClassement collections={collections} />
      </header>

      {listes.length === 0 ? (
        <p className="vide sous-titre">Aucun classement pour l&apos;instant.</p>
      ) : (
        <ul className="jury__liste">
          {listes.map((tl) => {
            const contenu = contenuSur(tl.contenu);
            return (
              <li key={tl.id}>
                <Link href={`/jury/${tl.id}`} className="carte-jury">
                  <div className="apercu-tier" aria-hidden>
                    {contenu.rangs.slice(0, 6).map((r) => {
                      const placees = r.tenues.map((id) => parId.get(id)).filter(Boolean);
                      return (
                        <div key={r.id} className="apercu-tier__rang">
                          <span className="apercu-tier__etiquette" style={{ background: couleurCss(r.couleur) }}>
                            {r.nom}
                          </span>
                          <span className="apercu-tier__tenues">
                            {placees.slice(0, 8).map((t) => (
                              <ImageTenue key={t!.id} tenue={t!} format="vignette" />
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <h2 className="titre-3">{tl.titre}</h2>
                  <p className="legende">Modifié le {dateLongue(tl.modifie_le)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
