/**
 * Modele de donnees d'une offre.
 *
 * Les offres viennent desormais du flux France Travail, via le scenario Make.
 * Le modele decrit exactement ce que cette source fournit : pas de champ
 * invente, pas de champ laisse vide en permanence. Une source plus riche
 * viendra l'etendre, champ par champ, quand elle existera.
 */
export interface Job {
  /** Cle stable et segment d'URL : la reference de l'annonce. */
  id: string;
  /** Reference France Travail, motif AAAA-NNNNN. */
  reference: string | null;
  title: string;
  company: string;
  /** Libelle brut du flux : "CDD", "CDI", "CDD - Contrat de professionnalisation". */
  contractType: string | null;
  /** Date de publication au format ISO YYYY-MM-DD. */
  publishedAt: string | null;
  /** Texte brut, balises retirees : jamais injecte tel quel. */
  description: string;
  profile: string;
  /** Lien vers l'annonce d'origine. */
  sourceUrl: string | null;
  /** Provenance : 'france-travail' aujourd'hui, d'autres demain. */
  source: string;
}

/* ------------------------------------------------------------------ */
/* Recherche                                                           */
/* ------------------------------------------------------------------ */

/** Valeur d'un filtre inactif. */
export const TOUS = 'tous';
export type Tous = typeof TOUS;

/** Fenetre de fraicheur d'une offre, en jours. */
export type FenetrePublication = Tous | '1' | '7' | '30';

/**
 * Les criteres se limitent a ce que le flux permet de trancher. Ajouter un
 * filtre suppose d'abord que la source porte l'information.
 */
export interface Filtres {
  recherche: string;
  contractType: string | Tous;
  source: string | Tous;
  publiee: FenetrePublication;
  sauvegardees: boolean;
}

export type CritereTri = 'pertinence' | 'recent';

export const FILTRES_VIDES: Filtres = {
  recherche: '',
  contractType: TOUS,
  source: TOUS,
  publiee: TOUS,
  sauvegardees: false,
};
