import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Coulisses } from "@/components/coulisses/Coulisses";
import { supabaseConfigure } from "@/lib/supabase/config";
import { roleCourant, supabaseServeur } from "@/lib/supabase/server";
import type { Collection, Lettre, Membre, Tenue } from "@/lib/types";

export const metadata: Metadata = { title: "Les Coulisses", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PageCoulisses() {
  if (!supabaseConfigure) redirect("/connexion");
  const { role, userId } = await roleCourant();
  if (!role) redirect("/connexion");

  const sb = await supabaseServeur();
  const [tenues, collections, lettre, membres] = await Promise.all([
    sb.from("tenues").select("*").order("cree_le", { ascending: false }),
    sb.from("collections").select("*").order("ordre").order("cree_le"),
    sb.from("lettre").select("*").eq("id", 1).maybeSingle(),
    sb.from("membres").select("*"),
  ]);
  const moi = ((membres.data as Membre[] | null) ?? []).find((m) => m.user_id === userId) ?? null;

  return (
    <Coulisses
      role={role}
      moi={moi}
      tenuesInitiales={(tenues.data as Tenue[] | null) ?? []}
      collectionsInitiales={(collections.data as Collection[] | null) ?? []}
      lettreInitiale={(lettre.data as Lettre | null) ?? null}
    />
  );
}
