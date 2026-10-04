import { TOUS } from '../types/job';
import type { CritereTri, Filtres, Job } from '../types/job';

/**
 * Moteur de recherche cote client : filtrage, scoring et tri.
 * Fonctions pures, sans DOM et sans acces aux services.
 */

const JOUR_MS = 86_400_000;

/** Minuscule, sans accent, sans ponctuation : base de toutes les comparaisons. */
function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9+#./ ]/g, ' ');
}

/** Poids de chaque champ dans le score de pertinence. */
const POIDS = { titre: 10, reference: 6, contrat: 3, description: 1 } as const;

interface ChampIndexe {
  valeur: string;
  poids: number;
}

function indexer(job: Job): ChampIndexe[] {
  return [
    { valeur: normaliser(job.title), poids: POIDS.titre },
    { valeur: normaliser(job.reference ?? ''), poids: POIDS.reference },
    { valeur: normaliser(job.contractType ?? ''), poids: POIDS.contrat },
    { valeur: normaliser(job.description), poids: POIDS.description },
  ];
}

/**
 * Score d'un terme sur une offre indexee.
 * Un mot en debut de champ vaut plus qu'une occurrence au milieu d'un texte.
 */
function scorerTerme(champs: ChampIndexe[], terme: string): number {
  let score = 0;

  for (const champ of champs) {
    const position = champ.valeur.indexOf(terme);
    if (position === -1) continue;

    const debutDeMot = position === 0 || champ.valeur[position - 1] === ' ';
    score += champ.poids * (debutDeMot ? 1.5 : 1);
  }

  return score;
}

/**
 * Score global d'une offre pour une requete.
 * Retourne 0 si un seul des termes est absent : la recherche est conjonctive.
 */
export function scorerJob(job: Job, requete: string): number {
  const termes = normaliser(requete).split(' ').filter(Boolean);
  if (termes.length === 0) return 0;

  const champs = indexer(job);
  let total = 0;

  for (const terme of termes) {
    const score = scorerTerme(champs, terme);
    if (score === 0) return 0;
    total += score;
  }

  return total;
}

/** Bonus de fraicheur : departage les offres de score equivalent. */
function fraicheur(job: Job, maintenant: Date): number {
  if (!job.publishedAt) return 0;
  const jours = Math.max(
    0,
    Math.floor(
      (maintenant.getTime() - new Date(`${job.publishedAt}T00:00:00`).getTime()) / JOUR_MS,
    ),
  );
  return Math.max(0, 10 - jours / 7);
}

function correspondAuxFiltres(job: Job, filtres: Filtres, sauvegardes: Set<string>): boolean {
  if (filtres.sauvegardees && !sauvegardes.has(job.id)) return false;
  if (filtres.contractType !== TOUS && job.contractType !== filtres.contractType) return false;
  return true;
}

function dansLaFenetre(job: Job, filtres: Filtres, maintenant: Date): boolean {
  if (filtres.publiee === TOUS) return true;
  if (!job.publishedAt) return false;

  const limite = Number(filtres.publiee);
  const jours = Math.floor(
    (maintenant.getTime() - new Date(`${job.publishedAt}T00:00:00`).getTime()) / JOUR_MS,
  );
  return jours <= limite;
}

/** Predicat unique : filtres, fenetre de publication et requete textuelle. */
function evaluer(
  job: Job,
  filtres: Filtres,
  sauvegardes: Set<string>,
  requete: string,
  maintenant: Date,
): number | null {
  if (!correspondAuxFiltres(job, filtres, sauvegardes)) return null;
  if (!dansLaFenetre(job, filtres, maintenant)) return null;
  if (!requete) return 0;

  const score = scorerJob(job, requete);
  return score === 0 ? null : score;
}

interface JobScore {
  job: Job;
  score: number;
}

function comparer(a: JobScore, b: JobScore, tri: CritereTri, maintenant: Date): number {
  const dateA = a.job.publishedAt ?? '';
  const dateB = b.job.publishedAt ?? '';

  switch (tri) {
    case 'pertinence': {
      const ecart = b.score - a.score;
      if (ecart !== 0) return ecart;
      const fraicheurEcart = fraicheur(b.job, maintenant) - fraicheur(a.job, maintenant);
      if (fraicheurEcart !== 0) return fraicheurEcart;
      return dateB.localeCompare(dateA);
    }
    case 'recent':
      return dateB.localeCompare(dateA);
    case 'ancien':
      return dateA.localeCompare(dateB);
  }
}

/** Applique les filtres puis le tri demande. */
export function rechercherJobs(
  jobs: Job[],
  filtres: Filtres,
  tri: CritereTri,
  sauvegardes: Set<string> = new Set(),
  maintenant: Date = new Date(),
): Job[] {
  const requete = filtres.recherche.trim();
  const resultats: JobScore[] = [];

  for (const job of jobs) {
    const score = evaluer(job, filtres, sauvegardes, requete, maintenant);
    if (score !== null) resultats.push({ job, score });
  }

  return resultats.sort((a, b) => comparer(a, b, tri, maintenant)).map((resultat) => resultat.job);
}

/**
 * Nombre d'offres par type de contrat, tous les autres criteres appliques.
 * Alimente les decomptes du panneau de filtres.
 */
export function compterParContrat(
  jobs: Job[],
  filtres: Filtres,
  sauvegardes: Set<string> = new Set(),
  maintenant: Date = new Date(),
): Map<string, number> {
  const sansContrat: Filtres = { ...filtres, contractType: TOUS };
  const requete = filtres.recherche.trim();
  const comptes = new Map<string, number>();
  let total = 0;

  for (const job of jobs) {
    if (evaluer(job, sansContrat, sauvegardes, requete, maintenant) === null) continue;
    total += 1;
    if (job.contractType) comptes.set(job.contractType, (comptes.get(job.contractType) ?? 0) + 1);
  }

  comptes.set(TOUS, total);
  return comptes;
}

/** Types de contrat presents dans le lot, pour initialiser le filtre. */
export function contratsDisponibles(jobs: Job[]): string[] {
  const contrats = new Set<string>();
  for (const job of jobs) {
    if (job.contractType) contrats.add(job.contractType);
  }
  return [...contrats].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Nombre de filtres actifs, hors recherche textuelle. */
export function compterFiltresActifs(filtres: Filtres): number {
  let total = 0;
  if (filtres.contractType !== TOUS) total += 1;
  if (filtres.publiee !== TOUS) total += 1;
  if (filtres.sauvegardees) total += 1;
  return total;
}
