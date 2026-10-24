import { NextResponse, type NextRequest } from "next/server";
import { PNG } from "pngjs";
import { supabaseServeur } from "@/lib/supabase/server";
import { POIDS_MAX, verifierSkin } from "@/lib/verifications";

/**
 * Réception d'un skin : les vérifications du navigateur sont refaites ici,
 * puis le fichier est rangé dans le stockage avec la session du membre
 * (les règles d'accès s'appliquent).
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServeur();
  const { data: role } = await supabase.rpc("role_membre");
  if (!role) return NextResponse.json({ erreur: "Cet espace est réservé à la Maison." }, { status: 403 });

  const formulaire = await request.formData().catch(() => null);
  const fichier = formulaire?.get("fichier");
  const tenue = String(formulaire?.get("tenue") ?? "");
  if (!(fichier instanceof Blob) || !/^[0-9a-f-]{36}$/i.test(tenue)) {
    return NextResponse.json({ erreur: "Requête incomplète." }, { status: 400 });
  }
  if (fichier.size > POIDS_MAX * 2) {
    return NextResponse.json({ erreur: "Ce fichier est trop lourd pour un skin (200 Ko maximum)." }, { status: 413 });
  }

  const octets = new Uint8Array(await fichier.arrayBuffer());
  let pixels: Uint8Array | null = null;
  try {
    pixels = PNG.sync.read(Buffer.from(octets)).data;
  } catch {
    pixels = null;
  }
  const resultat = verifierSkin(octets, pixels);
  if (!resultat.ok) {
    const refus = resultat.verifications.find((v) => !v.ok);
    return NextResponse.json(
      { erreur: refus?.message ?? "Ce fichier n'est pas une image PNG.", verifications: resultat.verifications },
      { status: 422 },
    );
  }

  const chemin = `${tenue}/${Date.now()}.png`;
  const { error } = await supabase.storage.from("skins").upload(chemin, octets, {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return NextResponse.json({ erreur: "Le stockage a refusé le fichier." }, { status: 500 });
  return NextResponse.json({ chemin });
}
