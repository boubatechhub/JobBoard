import type { Job } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { icone } from './icones';

/** Action reconnue par la delegation d'evenements de l'application. */
export const ACTION_SAUVEGARDE = 'basculer-sauvegarde';

/**
 * Bouton de sauvegarde, partage par le registre et la fiche.
 * `aria-pressed` porte l'etat : le lecteur d'ecran annonce le changement sans
 * qu'on ait a modifier le libelle.
 */
export function boutonSignet(job: Job, sauvegardee: boolean, avecLibelle = false): string {
  const libelle = sauvegardee ? "Retirer l'offre des offres sauvegardees" : "Sauvegarder l'offre";

  const texte = avecLibelle
    ? `<span>${sauvegardee ? 'Offre sauvegardée' : "Sauvegarder l'offre"}</span>`
    : `<span class="sr-only">${escapeHtml(libelle)}</span>`;

  return `
    <button
      type="button"
      class="signet${avecLibelle ? ' signet--large' : ''}${sauvegardee ? ' est-actif' : ''}"
      data-action="${ACTION_SAUVEGARDE}"
      data-id="${escapeHtml(job.id)}"
      aria-pressed="${sauvegardee}"
      title="${escapeHtml(libelle)}"
    >
      ${icone('signet', sauvegardee)}
      ${texte}
    </button>
  `;
}
