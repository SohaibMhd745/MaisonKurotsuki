import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond } from "next/font/google";
import { Entete } from "@/components/Entete";
import { PiedDePage } from "@/components/PiedDePage";
import { MAISON } from "@/lib/maison";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/composants.css";
import "@/styles/foyer.css";
import "@/styles/garde-robe.css";
import "@/styles/lookbook.css";
import "@/styles/jury.css";
import "@/styles/coulisses.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: MAISON.nom, template: `%s · ${MAISON.nom}` },
  description: MAISON.description,
  icons: { icon: "/embleme.png" },
  openGraph: { siteName: MAISON.nom, locale: "fr_FR", type: "website" },
};

// Les rideaux du Foyer ne s'ouvrent qu'une fois par navigateur : on le sait
// avant le premier affichage pour ne jamais les montrer à nouveau.
const scriptRideaux = `try{if(localStorage.getItem("kurotsuki:rideaux"))document.documentElement.dataset.rideaux="ouverts"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${garamond.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptRideaux }} />
      </head>
      <body>
        <a className="lien-evitement" href="#contenu">
          Aller au contenu
        </a>
        <Entete />
        <main id="contenu">{children}</main>
        <PiedDePage />
      </body>
    </html>
  );
}
