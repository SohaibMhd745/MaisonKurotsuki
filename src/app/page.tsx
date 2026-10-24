import Link from "next/link";
import { Embleme } from "@/components/Embleme";
import { ImageTenue } from "@/components/Portrait";
import { Rideaux } from "@/components/Rideaux";
import { collectionsPubliques, tenuesPubliees } from "@/lib/donnees";
import { MAISON } from "@/lib/maison";
import { indexCollections, ordreCollection } from "@/lib/tri";

export const dynamic = "force-static";
export const revalidate = 3600;

export default async function Foyer() {
  const [tenues, collections] = await Promise.all([tenuesPubliees(), collectionsPubliques()]);
  const derniere = tenues[0] ?? null;
  const parId = indexCollections(collections);
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
            <ImageTenue tenue={derniere} prioritaire className="scene__portrait" />
          ) : (
            <div className="scene__vide" />
          )}
        </div>
        <div className="scene__texte">
          <h1 id="scene-titre" className="marque marque--scene">
            {MAISON.nom}
          </h1>
          <p className="sous-titre scene__accroche">{MAISON.accroche}</p>
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
          <header className="section__entete">
            <p className="legende">La Maison présente</p>
            <h2 id="collections-titre" className="titre-2">
              Les collections
            </h2>
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

      {derniere && (
        <section className="section page derniere" aria-labelledby="derniere-titre">
          <div className="derniere__image">
            <ImageTenue tenue={derniere} />
          </div>
          <div className="derniere__texte">
            <p className="legende">La dernière création</p>
            <h2 id="derniere-titre" className="titre-1">
              {derniere.nom}
            </h2>
            {parId.get(derniere.collection_id) && (
              <p className="sous-titre">{parId.get(derniere.collection_id)!.titre}</p>
            )}
            <div className="ornement" aria-hidden />
            {derniere.details && <p className="derniere__details">{derniere.details}</p>}
            {derniere.note && (
              <blockquote className="citation">
                <p>{derniere.note}</p>
              </blockquote>
            )}
            {derniere.creee_pour && <p className="legende">Créée pour {derniere.creee_pour}</p>}
            <Link href={`/lookbook/${derniere.slug}`} className="bouton">
              La voir dans le lookbook
            </Link>
          </div>
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
