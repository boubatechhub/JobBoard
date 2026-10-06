import type { PosteOuvert } from '../types/france-travail';

/**
 * Parsing du flux France Travail. Fonctions pures, sans DOM et sans reseau :
 * tout est testable en isolation, et c'est ici qu'on absorbe les surprises
 * d'une source qu'on ne maitrise pas.
 *
 * Le module RSS de Make ne nomme pas ses champs de la meme facon selon la
 * version du scenario ; plutot que de parier sur un nom, on accepte les alias
 * connus et on rejette proprement ce qui ne ressemble a rien.
 */

/** Reference en tete de titre : "2024-12345 - Chargé de mission". */
const MOTIF_REFERENCE = /^(\d{4}-\d+)/;

/** Tiret separateur, y compris demi-cadratin et cadratin venus du flux. */
const TIRET_DEBUT = /^[\s–—-]+/;
const TIRET_FIN = /[\s–—-]+$/;

/**
 * Artefacts de generation presents dans presque toutes les annonces.
 * Repetes, parfois colles au texte utile : on avale aussi l'espace qui precede.
 */
const ARTEFACTS = /(\s*2\.16\.1\.2)+/g;

const MARQUEUR_DESCRIPTION = '<b>Description du poste : </b><br />';
const SEPARATEUR_PARAGRAPHES = '<br /><br />';

/* ------------------------------------------------------------------ */
/* Titre                                                               */
/* ------------------------------------------------------------------ */

/** Reference du poste, ou `null` si le titre n'en porte pas. */
export function extraireReference(titre: string): string | null {
  return MOTIF_REFERENCE.exec(titre.trim())?.[1] ?? null;
}

/**
 * Intitule seul.
 * Deux cas frequents dans le flux : les titres sans ville, et ceux qui se
 * terminent par un tiret orphelin quand la ville manque a la generation.
 */
export function extraireIntitule(titre: string): string {
  return titre
    .trim()
    .replace(MOTIF_REFERENCE, '')
    .replace(TIRET_DEBUT, '')
    .replace(TIRET_FIN, '')
    .trim();
}

/* ------------------------------------------------------------------ */
/* Description                                                         */
/* ------------------------------------------------------------------ */

const ENTITES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/**
 * Ramene un fragment HTML a du texte : les sauts de ligne sont conserves, les
 * balises disparaissent. L'affichage n'aura donc jamais a faire confiance au
 * balisage de la source, il n'en reste plus.
 */
export function texteDepuisHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, (entite) => ENTITES[entite.toLowerCase()] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((ligne) => ligne.trim())
    .join('\n')
    .trim();
}

export interface DescriptionAnnonce {
  poste: string;
  profil: string;
}

/**
 * Decoupe le champ HTML de l'annonce.
 *
 * 1. les artefacts "2.16.1.2" sautent
 * 2. l'en-tete jusqu'au marqueur de description saute
 * 3. le premier "<br /><br />" separe le poste du profil recherche
 *
 * Marqueur absent : on garde tout le corps plutot que de perdre l'annonce.
 * Separateur absent : le profil reste vide, la description prend le tout.
 */
export function parserDescription(html: string): DescriptionAnnonce {
  const nettoye = html.replace(ARTEFACTS, '');

  const debut = nettoye.indexOf(MARQUEUR_DESCRIPTION);
  const corps = debut === -1 ? nettoye : nettoye.slice(debut + MARQUEUR_DESCRIPTION.length);

  const coupure = corps.indexOf(SEPARATEUR_PARAGRAPHES);
  const brutPoste = coupure === -1 ? corps : corps.slice(0, coupure);
  const brutProfil = coupure === -1 ? '' : corps.slice(coupure + SEPARATEUR_PARAGRAPHES.length);

  return { poste: texteDepuisHtml(brutPoste), profil: texteDepuisHtml(brutProfil) };
}

/* ------------------------------------------------------------------ */
/* Date                                                                */
/* ------------------------------------------------------------------ */

/**
 * Les dates RSS arrivent en RFC 822 ("Tue, 01 Sep 2026 10:00:00 GMT").
 * On les ramene au format ISO court attendu par `formaterDate`.
 */
export function enDateIso(valeur: string): string | null {
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return null;

  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

/* ------------------------------------------------------------------ */
/* Normalisation de la reponse                                         */
/* ------------------------------------------------------------------ */

type Enregistrement = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Enregistrement {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

/** Premiere valeur textuelle non vide parmi les alias donnes. */
function texte(item: Enregistrement, ...cles: string[]): string | null {
  for (const cle of cles) {
    const valeur = item[cle];
    if (typeof valeur === 'string' && valeur.trim()) return valeur.trim();
  }
  return null;
}

/**
 * `categories` est un tableau dans le module RSS de Make, mais certaines
 * versions remontent une chaine unique.
 */
function premiereCategorie(item: Enregistrement): string | null {
  const brut = item['categories'] ?? item['category'];

  if (Array.isArray(brut)) {
    const premiere = brut.find((valeur) => typeof valeur === 'string' && valeur.trim());
    return typeof premiere === 'string' ? premiere.trim() : null;
  }
  return typeof brut === 'string' && brut.trim() ? brut.trim() : null;
}

/**
 * Retrouve les annonces, qu'elles soient le tableau lui-meme, enveloppees sous
 * un nom courant, ou reparties entre les flux `francetravail` et `airfrance`.
 */
export function extraireItems(donnees: unknown): Enregistrement[] {
  const annoter = (valeur: unknown, source: PosteOuvert['source']): Enregistrement[] =>
    Array.isArray(valeur)
      ? valeur.filter(estObjet).map((item) => ({ ...item, __source: source }))
      : [];

  if (Array.isArray(donnees)) return annoter(donnees, 'france-travail');

  if (estObjet(donnees)) {
    for (const cle of ['items', 'body', 'data', 'results', 'value']) {
      const valeur = donnees[cle];
      if (Array.isArray(valeur)) return annoter(valeur, 'france-travail');
    }

    return [
      ...annoter(donnees['francetravail'], 'france-travail'),
      ...annoter(donnees['airfrance'], 'airfrance'),
    ];
  }
  return [];
}

/**
 * La reponse contient-elle bien un tableau d'annonces, meme vide ?
 * Sert a distinguer un flux legitimement vide d'une reponse dont la forme
 * n'est pas celle attendue : le premier cas est un etat vide, le second une
 * erreur qui merite d'etre dite.
 */
export function contientTableau(donnees: unknown): boolean {
  if (Array.isArray(donnees)) return true;
  if (!estObjet(donnees)) return false;

  return ['items', 'body', 'data', 'results', 'value', 'francetravail', 'airfrance'].some((cle) =>
    Array.isArray(donnees[cle]),
  );
}

/* ------------------------------------------------------------------ */
/* Point d'entree                                                      */
/* ------------------------------------------------------------------ */

/**
 * Transforme la reponse brute du scenario Make en postes affichables.
 *
 * Seule une annonce sans titre du tout est ecartee : sans texte, il n'y a
 * rien a afficher. Un titre qui se reduit a rien apres nettoyage (ex.
 * "2026-12345 -" seul, reference sans libelle) ne fait PAS perdre l'offre :
 * on retombe sur le titre brut plutot que de faire disparaitre une annonce
 * reellement recuperee du flux. Le compteur de l'interface doit correspondre
 * a ce que le flux a effectivement renvoye.
 */
export function parserPostes(donnees: unknown): PosteOuvert[] {
  const postes = new Map<string, PosteOuvert>();

  for (const item of extraireItems(donnees)) {
    const titre = texte(item, 'title', 'titre', 'name');
    if (!titre) continue;

    const source: PosteOuvert['source'] =
      item['__source'] === 'airfrance' ? 'airfrance' : 'france-travail';
    const intitule = extraireIntitule(titre) || titre;
    const reference = extraireReference(titre);
    const lien = texte(item, 'link', 'url', 'guid', 'permalink');
    const publiee = texte(item, 'pubDate', 'published', 'date', 'dateCreated', 'isoDate');
    const description = texte(item, 'description', 'summary', 'content', 'contentSnippet') ?? '';

    const { poste: descriptionPoste, profil } = parserDescription(description);

    const poste: PosteOuvert = {
      id: reference ?? lien ?? `${intitule}-${postes.size}`,
      reference,
      intitule,
      contrat: premiereCategorie(item),
      datePublication: publiee ? enDateIso(publiee) : null,
      lien,
      source,
      descriptionPoste,
      profilRecherche: profil,
    };

    const existant = postes.get(poste.id);
    if (!existant || source === 'airfrance') postes.set(poste.id, poste);
  }

  return [...postes.values()];
}

/** Types de contrat presents dans le lot, pour alimenter le filtre. */
export function contratsDisponibles(postes: PosteOuvert[]): string[] {
  const contrats = new Set<string>();
  for (const poste of postes) {
    if (poste.contrat) contrats.add(poste.contrat);
  }
  return [...contrats].sort((a, b) => a.localeCompare(b, 'fr'));
}
