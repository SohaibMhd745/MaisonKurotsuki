"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAISON } from "@/lib/maison";
import { Embleme } from "./Embleme";

const GAUCHE = [
  { href: "/", libelle: "Foyer", actif: (p: string) => p === "/" },
  { href: "/garde-robe", libelle: "Garde-robe", actif: (p: string) => p.startsWith("/garde-robe") },
];
const DROITE = [
  { href: "/lookbook", libelle: "Lookbook", actif: (p: string) => p.startsWith("/lookbook") },
  { href: "/jury", libelle: "Jury", actif: (p: string) => p.startsWith("/jury") },
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
        <Link href="/" className="entete__marque" aria-label={`${MAISON.nomCourt}, retour au Foyer`}>
          <Embleme className="entete__embleme" />
          <span>{MAISON.nomCourt}</span>
        </Link>
        <div className="entete__groupe entete__groupe--droite">
          {DROITE.map(lien)}
          <Link
            href="/coulisses"
            className="entete__coulisses"
            aria-label="Coulisses"
            title="Coulisses"
            aria-current={chemin.startsWith("/coulisses") ? "page" : undefined}
          >
            <svg
              className="entete__coulisses-icone"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="m21 2-9.6 9.6" />
              <path d="m15.5 7.5 2.5 2.5" />
              <path d="m18 5 2 2" />
            </svg>
          </Link>
        </div>
      </nav>
    </header>
  );
}
