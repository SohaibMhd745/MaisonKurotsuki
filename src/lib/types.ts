export type Gabarit = "classic" | "slim";
export type Statut = "publiee" | "masquee" | "brouillon";
export type Role = "creatrice" | "ami";

export interface Collection {
  id: string;
  slug: string;
  ordre: number;
  titre: string;
  description: string;
  cree_le: string;
  modifie_le: string;
}

export interface Tenue {
  id: string;
  slug: string;
  nom: string;
  collection_id: string;
  gabarit: Gabarit;
  statut: Statut;
  ordre: number;
  skin_path: string;
  portrait_path: string | null;
  vignette_path: string | null;
  details: string;
  note: string;
  creee_pour: string;
  auteur: string | null;
  publiee_le: string | null;
  cree_le: string;
  modifie_le: string;
}

export interface Rang {
  id: string;
  nom: string;
  /** « palette:N » (couleur du design system) ou une couleur libre « #rrggbb ». */
  couleur: string;
  tenues: string[];
}

export interface ContenuTierList {
  rangs: Rang[];
}

export interface TierList {
  id: string;
  titre: string;
  collections: string[];
  contenu: ContenuTierList;
  auteur: string | null;
  version: number;
  cree_le: string;
  modifie_le: string;
}

export interface Lettre {
  id: number;
  texte: string;
  signature: string;
  lue_le: string | null;
  modifie_le: string;
}

export interface Membre {
  discord_id: string;
  user_id: string | null;
  nom: string | null;
  avatar_url: string | null;
  role: Role;
}
