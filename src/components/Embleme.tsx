/** L'emblème de la Maison Kurotsuki, aux couleurs originelles. */
export function Embleme({ className = "", decoratif = true }: { className?: string; decoratif?: boolean }) {
  return (
    <span
      className={`embleme ${className}`}
      role={decoratif ? undefined : "img"}
      aria-hidden={decoratif || undefined}
      aria-label={decoratif ? undefined : "Emblème de la Maison Kurotsuki : une lune noire et une rose"}
    />
  );
}
