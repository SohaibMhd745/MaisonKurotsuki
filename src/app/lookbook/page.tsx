import { redirect } from "next/navigation";
import { tenuesPubliees } from "@/lib/donnees";

export const dynamic = "force-dynamic";

/** /lookbook ouvre la tenue la plus récente. */
export default async function LookbookAccueil() {
  const [derniere] = await tenuesPubliees();
  if (derniere) redirect(`/lookbook/${derniere.slug}`);
  return (
    <div className="page vide">
      <h1 className="titre-1">Le Lookbook</h1>
      <p className="sous-titre">La garde-robe attend sa première tenue.</p>
    </div>
  );
}
