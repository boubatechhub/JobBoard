import type { Job } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { lienVersOffre } from '../lib/routeur';
import { estNouveau, formaterAnciennete, formaterDate, libelleSource } from '../lib/format';
import { badge, logoEntreprise } from './elements';
import { boutonSignet } from './bouton-signet';

/**
 * Ligne du registre. Le flux fournit le poste, le contrat, la date et la
 * reference : c'est tout ce que la ligne montre.
 * Aucun encadrement : la ligne est separee de la suivante par un filet,
 * l'elevation est portee une seule fois par le registre qui la contient.
 */
export interface OptionsCarteJob {
  href: string;
  selectionnee: boolean;
  consultee: boolean;
}

export function carteJob(
  job: Job,
  sauvegardee: boolean,
  index = 0,
  options: OptionsCarteJob = { href: lienVersOffre(job.id), selectionnee: false, consultee: false },
): string {
  const source = libelleSource(job.source);
  const classeSource = job.source === 'airfrance' ? 'airfrance' : 'france-travail';
  const classes = [
    'offre',
    options.selectionnee ? 'offre--selectionnee' : '',
    options.consultee ? 'offre--consultee' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return `
    <article class="${classes}" data-job="${escapeHtml(job.id)}" style="--i: ${Math.min(index, 8)}">
      ${logoEntreprise(source)}

      <div class="offre__principal">
        <h3 class="offre__titre">
          <a class="offre__lien" href="${escapeHtml(options.href)}" data-action="selectionner-offre" data-id="${escapeHtml(job.id)}" ${options.selectionnee ? 'aria-current="true"' : ''}>${escapeHtml(job.title)}</a>
        </h3>
        <p class="offre__entreprise">
          <span class="badge badge--source badge--source-${classeSource}">${escapeHtml(source)}</span>
        </p>

        <ul class="offre__faits">
          ${job.contractType ? `<li>${badge(job.contractType, 'accent')}</li>` : ''}
        </ul>
        ${job.description ? `<p class="offre__extrait">${escapeHtml(job.description)}</p>` : ''}
      </div>

      <div class="offre__cote">
        ${
          job.publishedAt
            ? `<p class="offre__date" title="${escapeHtml(formaterDate(job.publishedAt))}">${escapeHtml(
                formaterAnciennete(job.publishedAt),
              )}</p>`
            : ''
        }
        ${job.publishedAt && estNouveau(job.publishedAt) ? badge('Nouveau', 'alerte') : ''}
      </div>

      <div class="offre__actions">${boutonSignet(job, sauvegardee)}</div>
    </article>
  `;
}
