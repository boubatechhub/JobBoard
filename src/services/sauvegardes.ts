/**
 * Offres sauvegardees par l'utilisateur : favoris, interet declare et note
 * personnelle.
 *
 * Persistance locale (localStorage) en attendant le backend de la phase 2.
 * Le contrat est deja celui d'une API : les ecritures sont asynchrones et
 * peuvent echouer. Les lectures passent par un cache memoire charge une fois au
 * demarrage, comme le ferait un etat client synchronise avec un serveur.
 */

const CLE_STOCKAGE = 'alternance.sauvegardes.v1';

export interface Sauvegarde {
  jobId: string;
  /** Date ISO complete de la sauvegarde. */
  savedAt: string;
  /** L'utilisateur a marque l'offre comme interessante. */
  interested: boolean;
  note: string;
}

let cache = new Map<string, Sauvegarde>();
let chargee = false;

function lireStockage(): Sauvegarde[] {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (!brut) return [];
    const donnees: unknown = JSON.parse(brut);
    if (!Array.isArray(donnees)) return [];
    return donnees.filter(estSauvegarde);
  } catch {
    // Navigation privee, quota depasse ou donnees corrompues : on repart a vide
    // plutot que de casser l'application.
    return [];
  }
}

function estSauvegarde(valeur: unknown): valeur is Sauvegarde {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const candidat = valeur as Partial<Sauvegarde>;
  return typeof candidat.jobId === 'string' && typeof candidat.savedAt === 'string';
}

function ecrireStockage(): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify([...cache.values()]));
  } catch {
    // Ecriture impossible : l'etat memoire reste correct pour la session.
  }
}

/** A appeler une fois au demarrage, avant le premier rendu. */
export async function chargerSauvegardes(): Promise<void> {
  if (chargee) return;
  cache = new Map(lireStockage().map((sauvegarde) => [sauvegarde.jobId, sauvegarde]));
  chargee = true;
}

/* --- Lectures synchrones sur le cache --- */

export function estSauvegardee(jobId: string): boolean {
  return cache.has(jobId);
}

export function obtenirSauvegarde(jobId: string): Sauvegarde | null {
  return cache.get(jobId) ?? null;
}

export function compterSauvegardes(): number {
  return cache.size;
}

export function identifiantsSauvegardes(): string[] {
  return [...cache.keys()];
}

/* --- Ecritures asynchrones --- */

export async function basculerSauvegarde(jobId: string): Promise<boolean> {
  if (cache.has(jobId)) {
    cache.delete(jobId);
    ecrireStockage();
    return false;
  }

  cache.set(jobId, {
    jobId,
    savedAt: new Date().toISOString(),
    interested: false,
    note: '',
  });
  ecrireStockage();
  return true;
}

/** Marque ou demarque l'interet ; sauvegarde l'offre au passage si besoin. */
export async function basculerInteret(jobId: string): Promise<boolean> {
  const existante = cache.get(jobId);
  if (!existante) {
    cache.set(jobId, {
      jobId,
      savedAt: new Date().toISOString(),
      interested: true,
      note: '',
    });
    ecrireStockage();
    return true;
  }

  existante.interested = !existante.interested;
  ecrireStockage();
  return existante.interested;
}

export async function definirNote(jobId: string, note: string): Promise<void> {
  const existante = cache.get(jobId);
  if (existante) {
    existante.note = note;
  } else {
    cache.set(jobId, {
      jobId,
      savedAt: new Date().toISOString(),
      interested: false,
      note,
    });
  }
  ecrireStockage();
}
