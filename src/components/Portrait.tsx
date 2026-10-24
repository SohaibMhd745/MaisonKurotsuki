import { urlPortrait, urlVignette } from "@/lib/fichiers";
import type { Tenue } from "@/lib/types";

/** Image statique d'une tenue (jamais de 3D sur les pages à plusieurs tenues). */
export function ImageTenue({
  tenue,
  format = "portrait",
  className = "",
  prioritaire = false,
  crossOrigin,
}: {
  tenue: Pick<Tenue, "nom" | "portrait_path" | "vignette_path">;
  format?: "portrait" | "vignette";
  className?: string;
  prioritaire?: boolean;
  /** Nécessaire seulement pour l'export en image. */
  crossOrigin?: "anonymous";
}) {
  const src = format === "portrait" ? urlPortrait(tenue) : urlVignette(tenue);
  if (!src) return <span className={`image-tenue image-tenue--absente ${className}`} role="img" aria-label={tenue.nom} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`image-tenue ${className}`}
      src={src}
      alt={tenue.nom}
      loading={prioritaire ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={prioritaire ? "high" : undefined}
      crossOrigin={crossOrigin}
      draggable={false}
    />
  );
}
