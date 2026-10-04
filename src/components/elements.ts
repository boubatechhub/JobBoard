import { escapeHtml } from '../lib/dom';
import { initiales, teinteEntreprise } from '../lib/format';
import { icone } from './icones';
import type { NomIcone } from './icones';

/**
 * Primitives d'interface partagees par le registre et la fiche.
 * Chaque fonction retourne du HTML : toute valeur interpolee passe par
 * escapeHtml().
 */

export type VarianteBadge = 'neutre' | 'accent' | 'alerte';

/** Reserve aux etats exceptionnels : echeance proche, selection. */
export function badge(texte: string, variante: VarianteBadge = 'neutre'): string {
  return `<span class="badge badge--${variante}">${escapeHtml(texte)}</span>`;
}

/**
 * Marque de l'entreprise. A defaut de logo fourni par la source, les initiales
 * sur une teinte deduite du nom : stable, lisible, sans requete reseau.
 */
export function logoEntreprise(entreprise: string, logo?: string, grand = false): string {
  const classe = grand ? 'logo logo--grand' : 'logo';

  if (logo) {
    return `<img class="${classe}" src="${escapeHtml(logo)}" alt="" loading="lazy" width="52" height="52" />`;
  }

  return `<span class="${classe}" style="--teinte: ${teinteEntreprise(entreprise)}" aria-hidden="true">${escapeHtml(
    initiales(entreprise),
  )}</span>`;
}

/** Information secondaire prefixee d'une icone. */
export function fait(nom: NomIcone, texte: string): string {
  return `<li class="fait">${icone(nom)}<span>${escapeHtml(texte)}</span></li>`;
}

/** Ligne cle / valeur de l'encart des conditions. */
export function faitCle(cle: string, valeur: string): string {
  return `
    <div>
      <dt>${escapeHtml(cle)}</dt>
      <dd>${escapeHtml(valeur)}</dd>
    </div>
  `;
}
