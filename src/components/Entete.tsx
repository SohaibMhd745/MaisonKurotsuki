"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAISON } from "@/lib/maison";
import { Embleme } from "./Embleme";

const GAUCHE = [
  { href: "/", libelle: "Le Foyer", actif: (p: string) => p === "/" },
  { href: "/garde-robe", libelle: "La Garde-robe", actif: (p: string) => p.startsWith("/garde-robe") },
];
const DROITE = [
  { href: "/lookbook", libelle: "Le Lookbook", actif: (p: string) => p.startsWith("/lookbook") },
  { href: "/jury", libelle: "Le Jury", actif: (p: string) => p.startsWith("/jury") },
];

export function Entete() {
  const chemin = usePathname() ?? "/";
  const lien = (l: (typeof GAUCHE)[number]) => (
    <Link key={l.href} href={l.href} className="entete__lien" aria-current={l.actif(chemin) ? "page" : undefined}>
      {l.libelle}
    </Link>
  );
  return (
    <header className="entete">
      <nav className="entete__nav" aria-label="Espaces de la Maison">
        <div className="entete__groupe">{GAUCHE.map(lien)}</div>
        <Link href="/" className="entete__marque" aria-label={`${MAISON.nom}, retour au Foyer`}>
          <Embleme className="entete__embleme" />
          <span>{MAISON.nom}</span>
        </Link>
        <div className="entete__groupe entete__groupe--droite">
          {DROITE.map(lien)}
          <Link href="/coulisses" className="entete__coulisses" aria-current={chemin.startsWith("/coulisses") ? "page" : undefined}>
            Coulisses
          </Link>
        </div>
      </nav>
    </header>
  );
}
