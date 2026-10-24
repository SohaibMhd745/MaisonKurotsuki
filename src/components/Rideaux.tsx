"use client";

import { useEffect, useState } from "react";

const CLE = "kurotsuki:rideaux";

/**
 * L'ouverture des rideaux du Foyer : une seule fois par navigateur, 1,5 s au
 * plus, interrompue par un clic ou une touche. Déjà ouverts si l'on préfère
 * réduire les animations (géré en CSS) ou si on les a déjà vus (script du
 * layout, avant le premier affichage).
 */
export function Rideaux() {
  const [etat, setEtat] = useState<"fermes" | "ouverture" | "ouverts">("fermes");

  useEffect(() => {
    const dejaVus = document.documentElement.dataset.rideaux === "ouverts";
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (dejaVus || reduit) {
      setEtat("ouverts");
      memoriser();
      return;
    }
    memoriser();
    const ouvrir = () => setEtat((e) => (e === "fermes" ? "ouverture" : e));
    const toutDeSuite = () => setEtat("ouverts");
    const depart = window.setTimeout(ouvrir, 150);
    window.addEventListener("pointerdown", toutDeSuite, { once: true });
    window.addEventListener("keydown", toutDeSuite, { once: true });
    return () => {
      window.clearTimeout(depart);
      window.removeEventListener("pointerdown", toutDeSuite);
      window.removeEventListener("keydown", toutDeSuite);
    };
  }, []);

  if (etat === "ouverts") return null;
  return (
    <div
      className={`rideaux rideaux--${etat}`}
      aria-hidden
      onAnimationEnd={(e) => {
        if (e.animationName === "rideau-gauche") setEtat("ouverts");
      }}
    >
      <div className="rideaux__pan rideaux__pan--gauche" />
      <div className="rideaux__pan rideaux__pan--droite" />
    </div>
  );
}

function memoriser() {
  try {
    localStorage.setItem(CLE, "1");
  } catch {
    // Navigation privée : les rideaux s'ouvriront à nouveau, sans gravité.
  }
}
