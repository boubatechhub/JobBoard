/**
 * Postes ouverts chez France Travail, issus d'un scenario Make qui convertit
 * le flux RSS en JSON.
 *
 * Le flux est une source externe : rien n'y est garanti. Le type decrit ce que
 * l'interface sait afficher, pas ce que la source promet — d'ou les champs
 * nullables. Le parsing (`lib/france-travail.ts`) a la charge de ramener
 * n'importe quelle reponse a cette forme, ou de rejeter l'entree.
 */
export interface PosteOuvert {
  /** Cle stable : la reference si elle existe, sinon le lien. */
  id: string;
  /** Chiffres en tete du titre, motif AAAA-NNNNN. */
  reference: string | null;
  /** Titre sans la reference ni le tiret qui la suit. */
  intitule: string;
  /** Premier element de `categories`. */
  contrat: string | null;
  /** Date de publication au format ISO YYYY-MM-DD. */
  datePublication: string | null;
  /** Lien vers l'annonce d'origine. */
  lien: string | null;
  /** Flux qui a fourni l'annonce. */
  source: 'france-travail' | 'airfrance';
  /** Texte brut, balises retirees : jamais injecte tel quel. */
  descriptionPoste: string;
  profilRecherche: string;
}
