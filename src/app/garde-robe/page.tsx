import type { Metadata } from "next";
import { Suspense } from "react";
import { GardeRobe } from "@/components/garde-robe/GardeRobe";
import { collectionsPubliques, tenuesPubliees } from "@/lib/donnees";

export const revalidate = 3600;

export const metadata: Metadata = { title: "La Garde-robe" };

export default async function PageGardeRobe() {
  const [tenues, collections] = await Promise.all([tenuesPubliees(), collectionsPubliques()]);
  return (
    <div className="page garde-robe">
      <header className="page__entete">
        <p className="legende">Toutes les tenues</p>
        <h1 className="titre-1">La Garde-robe</h1>
      </header>
      <Suspense fallback={<GardeRobe tenues={tenues} collections={collections} statique />}>
        <GardeRobe tenues={tenues} collections={collections} />
      </Suspense>
    </div>
  );
}
