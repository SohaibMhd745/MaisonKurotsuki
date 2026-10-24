import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BoutonDiscord } from "@/components/coulisses/BoutonDiscord";
import { Embleme } from "@/components/Embleme";
import { supabaseConfigure } from "@/lib/supabase/config";
import { roleCourant } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ refuse?: string; erreur?: string }>;
}) {
  const { refuse, erreur } = await searchParams;
  if (supabaseConfigure && (await roleCourant()).role) redirect("/coulisses");

  return (
    <div className="page connexion">
      <div className="connexion__carte">
        <Embleme className="connexion__embleme" />
        <p className="legende">Les Coulisses</p>
        <h1 className="titre-2">Entrée des artistes</h1>
        {refuse ? (
          <p className="message message--alerte" role="alert">
            Cet espace est réservé à la Maison.
          </p>
        ) : erreur ? (
          <p className="message message--erreur" role="alert">
            La connexion n&apos;a pas abouti. Vous pouvez réessayer.
          </p>
        ) : (
          <p className="texte-doux">Les Coulisses sont réservées aux membres de la Maison.</p>
        )}
        <BoutonDiscord />
      </div>
    </div>
  );
}
