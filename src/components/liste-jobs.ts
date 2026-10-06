import type { Job } from '../types/job';
import { carteJob } from './carte-job';
import type { OptionsCarteJob } from './carte-job';
import { etatVide } from './etats';

export interface OptionsListeJobs {
  nombreAffichees: number;
  total: number;
  criteresActifs: boolean;
  premierRendu: boolean;
  optionsCarte: (job: Job) => OptionsCarteJob;
}

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
  options: OptionsListeJobs,
): string {
  if (jobs.length === 0) {
    return `<div class="registre">${etatVide(options.criteresActifs)}</div>`;
  }

  const visibles = jobs.slice(0, options.nombreAffichees);

  const lignes = visibles
    .map(
      (job, index) =>
        `<li>${carteJob(job, sauvegardes.has(job.id), index, options.optionsCarte(job))}</li>`,
    )
    .join('');

  return `
    <ul class="liste-offres registre${options.premierRendu ? ' registre--entrant' : ''}" id="liste-offres" aria-label="Offres d’emploi">
      ${lignes}
    </ul>
    ${
      options.nombreAffichees < options.total
        ? `<div class="liste-offres__pied"><button class="bouton bouton--secondaire" type="button" data-action="voir-plus">Voir plus d’offres (${options.nombreAffichees} sur ${options.total})</button></div>`
        : ''
    }
  `;
}
