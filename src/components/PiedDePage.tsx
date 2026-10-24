import Link from "next/link";
import { MAISON } from "@/lib/maison";
import { Embleme } from "./Embleme";

export function PiedDePage() {
  return (
    <footer className="pied">
      <div className="ornement" aria-hidden />
      <div className="pied__contenu">
        <Embleme className="pied__embleme" />
        <p className="pied__marque">{MAISON.nom}</p>
        <p className="legende">{MAISON.accroche}</p>
        <Link href="/coulisses" className="pied__coulisses">
          Coulisses
        </Link>
      </div>
    </footer>
  );
}
