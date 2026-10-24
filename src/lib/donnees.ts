import "server-only";
import { supabasePublic } from "./supabase/public";
import type { Collection, Tenue, TierList } from "./types";

/** Lectures publiques, utilisées pour pré-générer les pages. */

export async function collectionsPubliques(): Promise<Collection[]> {
  const sb = supabasePublic();
  if (!sb) return [];
  const { data, error } = await sb.from("collections").select("*").order("ordre").order("cree_le");
  if (error) console.error("collections", error.message);
  return (data as Collection[]) ?? [];
}

export async function tenuesPubliees(): Promise<Tenue[]> {
  const sb = supabasePublic();
  if (!sb) return [];
  const { data, error } = await sb
    .from("tenues")
    .select("*")
    .eq("statut", "publiee")
    .order("publiee_le", { ascending: false });
  if (error) console.error("tenues", error.message);
  return (data as Tenue[]) ?? [];
}

export async function tierLists(): Promise<TierList[]> {
  const sb = supabasePublic();
  if (!sb) return [];
  const { data, error } = await sb.from("tier_lists").select("*").order("cree_le", { ascending: false });
  if (error) console.error("tier_lists", error.message);
  return (data as TierList[]) ?? [];
}

export async function tierList(id: string): Promise<TierList | null> {
  const sb = supabasePublic();
  if (!sb || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await sb.from("tier_lists").select("*").eq("id", id).maybeSingle();
  return (data as TierList | null) ?? null;
}
