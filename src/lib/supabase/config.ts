/** Retire les espaces et guillemets collés par erreur autour d'une valeur. */
const nettoyer = (valeur: string | undefined) => (valeur ?? "").trim().replace(/^["']+|["']+$/g, "").trim();

export const SUPABASE_URL = nettoyer(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
/** Clé publishable (sb_publishable_…) ; l'ancienne clé « anon » reste acceptée. */
export const SUPABASE_ANON_KEY = nettoyer(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabaseConfigure = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function adresseValide(adresse: string): boolean {
  try {
    const { protocol } = new URL(adresse);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// La clé secrète contourne les règles d'accès : elle ne doit jamais partir vers le navigateur.
if (SUPABASE_ANON_KEY.startsWith("sb_secret_")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY contient la clé secrète (sb_secret_…). " +
      "Utilisez la clé publishable (sb_publishable_…), et régénérez la clé secrète si elle a déjà été déployée.",
  );
}

if (SUPABASE_URL.startsWith("sb_")) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL contient une clé et non l'adresse du projet. " +
      "L'adresse se trouve dans Supabase > Project Settings > Data API (https://xxxxxxxx.supabase.co).",
  );
}

// Mieux vaut un build qui échoue clairement qu'un site publié sans ses tenues.
if (supabaseConfigure && !adresseValide(SUPABASE_URL)) {
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL n'est pas une adresse valide (« ${SUPABASE_URL} »). ` +
      "Elle doit ressembler à https://xxxxxxxx.supabase.co (Supabase > Project Settings > Data API).",
  );
}
