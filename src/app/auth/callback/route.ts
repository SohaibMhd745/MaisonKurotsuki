import { NextResponse, type NextRequest } from "next/server";
import { supabaseServeur } from "@/lib/supabase/server";

/** Retour de Discord : ouvre la session, puis vérifie que le compte appartient à la Maison. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/connexion?erreur=1`);

  const supabase = await supabaseServeur();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/connexion?erreur=1`);

  const { data: role } = await supabase.rpc("synchroniser_membre");
  if (!role) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/connexion?refuse=1`);
  }
  return NextResponse.redirect(`${origin}/coulisses`);
}
