import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigure } from "@/lib/supabase/config";

/** Rafraîchit la session Supabase sur les routes réservées aux membres. */
export async function proxy(request: NextRequest) {
  let reponse = NextResponse.next({ request });
  if (!supabaseConfigure) return reponse;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aPoser) => {
        aPoser.forEach(({ name, value }) => request.cookies.set(name, value));
        reponse = NextResponse.next({ request });
        aPoser.forEach(({ name, value, options }) => reponse.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return reponse;
}

export const config = {
  matcher: ["/coulisses/:path*", "/connexion", "/api/skins", "/api/revalider"],
};
