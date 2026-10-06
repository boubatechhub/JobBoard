import type { PosteOuvert } from '../types/france-travail';
import type { Job } from '../types/job';
import { listerPostesOuverts } from './france-travail';

/**
 * Seule frontiere entre l'application et la provenance des offres.
 *
 * Les offres viennent du flux France Travail (`services/france-travail.ts`),
 * qui parle deja le protocole reseau et le parsing du flux RSS/JSON. Ce module
 * ne fait qu'adapter `PosteOuvert` (le vocabulaire de la source) vers `Job`
 * (le vocabulaire de l'application) : le reste du code ne connait que `Job`.
 *
 * Pas de cache ici : `listerPostesOuverts` va deja au reseau a chaque appel,
 * pour que « Réessayer » et le rechargement de page recuperent l'etat courant
 * du flux plutot qu'une copie perimee.
 */

function versJob(poste: PosteOuvert): Job {
  return {
    id: poste.id,
    reference: poste.reference,
    title: poste.intitule,
    company: 'France Travail',
    contractType: poste.contrat,
    publishedAt: poste.datePublication,
    description: poste.descriptionPoste,
    profile: poste.profilRecherche,
    sourceUrl: poste.lien,
    source: poste.source,
  };
}

export async function listerJobs(): Promise<Job[]> {
  const postes = await listerPostesOuverts();
  return postes.map(versJob);
}

export async function trouverJob(id: string): Promise<Job | null> {
  const jobs = await listerJobs();
  return jobs.find((job) => job.id === id) ?? null;
}
