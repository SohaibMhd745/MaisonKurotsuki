import { NextResponse, type NextRequest } from "next/server";
import { supabasePublic } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** Tâche quotidienne : une petite requête pour éviter la mise en pause de Supabase. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }
  const sb = supabasePublic();
  if (!sb) return NextResponse.json({ erreur: "Supabase non configuré" }, { status: 500 });
  const { error } = await sb.from("collections").select("id").limit(1);
  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, le: new Date().toISOString() });
}
