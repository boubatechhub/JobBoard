import type { Job } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { lienVersOffre } from '../lib/routeur';
import { formaterAnciennete } from '../lib/format';
import { badge, fait, logoEntreprise } from './elements';
import { boutonSignet } from './bouton-signet';

/**
 * Ligne du registre. Le flux France Travail ne fournit que le poste, le
 * contrat, la date et la reference : c'est tout ce que la ligne montre.
 * Aucun encadrement : la ligne est separee de la suivante par un filet,
 * l'elevation est portee une seule fois par le registre qui la contient.
 */
export function carteJob(job: Job, sauvegardee: boolean, index = 0): string {
  const lien = lienVersOffre(job.id);

  return `
    <article class="offre" data-job="${escapeHtml(job.id)}" style="--i: ${Math.min(index, 8)}">
      ${logoEntreprise(job.company)}

      <div class="offre__principal">
        <h3 class="offre__titre">
          <a class="offre__lien" href="${escapeHtml(lien)}">${escapeHtml(job.title)}</a>
        </h3>
        <p class="offre__entreprise">${escapeHtml(job.company)}</p>

        <ul class="offre__faits">
          ${job.contractType ? fait('contrat', job.contractType) : ''}
          ${job.reference ? fait('reference', job.reference) : ''}
        </ul>
      </div>

      <div class="offre__cote">
        ${
          job.publishedAt
            ? `<p class="offre__date">${escapeHtml(formaterAnciennete(job.publishedAt))}</p>`
            : ''
        }
        ${job.contractType ? badge(job.contractType, 'accent') : ''}
      </div>

      ${boutonSignet(job, sauvegardee)}
    </article>
  `;
}
