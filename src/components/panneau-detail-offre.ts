import type { Job } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { formaterAnciennete, formaterDate, libelleSource } from '../lib/format';
import { badge, faitCle } from './elements';
import { icone } from './icones';
import { ACTION_SAUVEGARDE, boutonSignet } from './bouton-signet';

function section(titre: string, texte: string): string {
  if (!texte.trim()) return '';
  return `
    <section class="detail-offre__section">
      <h3>${escapeHtml(titre)}</h3>
      <p class="detail-offre__texte">${escapeHtml(texte)}</p>
    </section>
  `;
}

export function panneauDetailOffre(job: Job, sauvegardee: boolean): string {
  const source = libelleSource(job.source);
  const classeSource = job.source === 'airfrance' ? 'airfrance' : 'france-travail';

  return `
    <aside class="detail-offre" aria-label="Détail de l’offre" aria-live="polite">
      <header class="detail-offre__entete">
        <button type="button" class="detail-offre__retour" data-action="fermer-detail">
          ${icone('fleche')} <span>Retour aux offres</span>
        </button>
        <p class="detail-offre__source">
          <span class="badge badge--source badge--source-${classeSource}">${escapeHtml(source)}</span>
        </p>
        <h2>${escapeHtml(job.title)}</h2>
        <ul class="detail-offre__meta">
          ${job.contractType ? `<li>${badge(job.contractType, 'accent')}</li>` : ''}
          ${job.publishedAt ? `<li title="${escapeHtml(formaterDate(job.publishedAt))}">${escapeHtml(formaterAnciennete(job.publishedAt))}</li>` : ''}
          ${job.reference ? `<li>Réf. ${escapeHtml(job.reference)}</li>` : ''}
        </ul>
        <div class="detail-offre__actions">
          ${
            job.sourceUrl
              ? `<a class="bouton bouton--primaire bouton--grand" href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">Postuler ${icone('externe')}</a>`
              : '<span class="detail-offre__sans-lien">Aucun lien de candidature fourni par cette annonce.</span>'
          }
          ${boutonSignet(job, sauvegardee, true)}
          ${job.sourceUrl ? `<button type="button" class="bouton bouton--secondaire bouton--grand" data-action="copier-lien" data-lien="${escapeHtml(job.sourceUrl)}">${icone('contrat')} Copier le lien</button>` : ''}
        </div>
      </header>
      <div class="detail-offre__corps">
        ${section('Description du poste', job.description)}
        ${section('Profil recherché', job.profile)}
        <dl class="detail-offre__faits">
          ${job.contractType ? faitCle('Contrat', job.contractType) : ''}
          ${job.publishedAt ? faitCle('Publication', formaterDate(job.publishedAt)) : ''}
          ${job.reference ? faitCle('Référence', job.reference) : ''}
          ${faitCle('Source', source)}
        </dl>
      </div>
    </aside>
  `;
}

export { ACTION_SAUVEGARDE };
