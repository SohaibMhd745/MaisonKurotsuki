import Link from "next/link";
import { Embleme } from "@/components/Embleme";
import { ImageTenue } from "@/components/Portrait";
import { Rideaux } from "@/components/Rideaux";
import { SceneTenue } from "@/components/SceneTenue";
import { collectionsPubliques, tenuesPubliees } from "@/lib/donnees";
import { MAISON } from "@/lib/maison";
import { ordreCollection } from "@/lib/tri";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function Foyer() {
  const [tenues, collections] = await Promise.all([tenuesPubliees(), collectionsPubliques()]);
  const derniere = tenues[0] ?? null;
  const collectionsGarnies = collections
    .map((c) => ({ collection: c, tenues: ordreCollection(tenues.filter((t) => t.collection_id === c.id)) }))
    .filter((c) => c.tenues.length > 0);

  return (
    <>
      <Rideaux />

      <section className="scene" aria-labelledby="scene-titre">
        <div className="scene__projecteur" aria-hidden />
        <Embleme className="scene__embleme" />
        <div className="scene__tenue">
          {derniere ? (
            <SceneTenue tenue={derniere} />
          ) : (
            <div className="scene__vide" />
          )}
        </div>
        <div className="scene__texte">
          <h1 id="scene-titre" className="marque marque--scene">
            {MAISON.nom}
          </h1>
          <div className="scene__actions">
            <Link href="/garde-robe" className="bouton bouton--principal">
              Entrer dans la garde-robe
            </Link>
            {derniere && (
              <Link href={`/lookbook/${derniere.slug}`} className="bouton">
                Ouvrir le lookbook
              </Link>
            )}
          </div>
        </div>
      </section>

      {collectionsGarnies.length > 0 && (
        <section className="section page" aria-labelledby="collections-titre">
          <header className="collections__entete">
            <p className="legende collections__surtitre">La Maison présente</p>
            <h2 id="collections-titre" className="collections__titre">
              Les collections
            </h2>
            <div className="collections__ornement" aria-hidden />
          </header>
          <ul className="collections-cartes">
            {collectionsGarnies.map(({ collection, tenues: ct }) => (
              <li key={collection.id}>
                <Link href={`/garde-robe?collection=${collection.slug}`} className="carte-collection">
                  <div className="carte-collection__tenues">
                    {ct.slice(0, 3).map((t) => (
                      <ImageTenue key={t.id} tenue={t} format="vignette" />
                    ))}
                  </div>
                  <h3 className="titre-3">{collection.titre}</h3>
                  {collection.description && <p className="texte-doux">{collection.description}</p>}
                  <p className="legende">
                    {ct.length} {ct.length > 1 ? "tenues" : "tenue"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!derniere && (
        <section className="section page vide">
          <p className="sous-titre">La garde-robe attend sa première tenue.</p>
        </section>
      )}
    </>
  );
}
