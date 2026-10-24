import Link from "next/link";

export default function Introuvable() {
  return (
    <div className="page vide">
      <p className="legende">Introuvable</p>
      <h1 className="titre-1">Cette page n&apos;est pas dans la garde-robe</h1>
      <Link href="/" className="bouton">
        Retour au Foyer
      </Link>
    </div>
  );
}
