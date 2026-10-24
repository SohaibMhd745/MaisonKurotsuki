import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { roleCourant } from "@/lib/supabase/server";

/** Régénère les pages publiques après une modification par un membre. */
export async function POST() {
  const { role } = await roleCourant();
  if (!role) return NextResponse.json({ erreur: "Réservé à la Maison." }, { status: 403 });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
