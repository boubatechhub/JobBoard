import type { Job } from '../types/job';
import { carteJob } from './carte-job';
import { etatVide } from './etats';
import { PAR_PAGE, pagination } from './pagination';

/**
 * Le registre, page par page.
 *
 * La liste reste plate et strictement dans l'ordre du tri : decouper la page en
 * groupes reordonnerait son contenu et le rang d'une offre ne voudrait plus
 * rien dire.
 */
export function listeJobs(
  jobs: Job[],
  sauvegardes: Set<string>,
  criteresActifs: boolean,
  premierRendu: boolean,
  page = 1,
): string {
  if (jobs.length === 0) {
    return `<div class="registre">${etatVide(criteresActifs)}</div>`;
  }

  const debut = (page - 1) * PAR_PAGE;
  const visibles = jobs.slice(debut, debut + PAR_PAGE);

  const lignes = visibles
    .map((job, index) => carteJob(job, sauvegardes.has(job.id), index))
    .join('');

  return `
    <div class="registre${premierRendu ? ' registre--entrant' : ''}">
      ${lignes}
      ${pagination(page, jobs.length)}
    </div>
  `;
}
