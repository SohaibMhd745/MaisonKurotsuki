import { Embleme } from "./Embleme";
import { MAISON } from "@/lib/maison";

/**
 * Écran d'inaccessibilité sur mobile / petit écran (section responsive).
 * Bloque l'accès et indique que le site est exclusivement réservé sur ordinateur.
 */
export function AvertissementMobile() {
  return (
    <aside className="ecran-mobile" role="dialog" aria-modal="true" aria-label="Accès restreint">
      <div className="ecran-mobile__carte">
        <Embleme className="ecran-mobile__embleme" />
        <p className="ecran-mobile__marque">{MAISON.nomCourt}</p>
        <div className="ornement" aria-hidden />
        <h2 className="titre-2 ecran-mobile__titre">Réservé aux ordinateurs</h2>
        <p className="texte-doux ecran-mobile__texte">L&apos;expérience et les présentations de haute couture de la Maison Kurotsuki sont conçues exclusivement pour un affichage sur grand écran.</p>
      </div>
    </aside>
  );
}
