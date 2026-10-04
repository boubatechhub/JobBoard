import { escapeHtml } from '../lib/dom';
import { icone } from './icones';

/** Action reconnue par la delegation d'evenements de la page. */
export const ACTION_PAGE = 'aller-page';

/** Nombre d'offres par page. */
export const PAR_PAGE = 5;

export function nombrePages(total: number): number {
  return Math.max(1, Math.ceil(total / PAR_PAGE));
}

/**
 * Numeros a afficher, avec des points de suspension a la place des sauts.
 * Sept emplacements au plus : la barre garde une largeur stable d'une page a
 * l'autre, elle ne se met pas a danser quand on avance.
 */
export function numerosPages(courante: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const retenus = new Set([1, total, courante, courante - 1, courante + 1]);
  if (courante <= 4) [2, 3, 4, 5].forEach((page) => retenus.add(page));
  if (courante >= total - 3)
    [total - 1, total - 2, total - 3, total - 4].forEach((p) => retenus.add(p));

  const triees = [...retenus].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);

  const sortie: (number | null)[] = [];
  let precedente = 0;
  for (const page of triees) {
    if (precedente && page - precedente > 1) sortie.push(null);
    sortie.push(page);
    precedente = page;
  }
  return sortie;
}

function lien(page: number, courante: number): string {
  const active = page === courante;
  return `
    <button
      type="button"
      class="pagination__lien${active ? ' est-active' : ''}"
      data-action="${ACTION_PAGE}"
      data-page="${page}"
      ${active ? 'aria-current="page"' : ''}
    >
      ${page}<span class="sr-only"> ${active ? '(page courante)' : ''}</span>
    </button>
  `;
}

function fleche(page: number, actif: boolean, sens: 'precedente' | 'suivante'): string {
  const libelle = sens === 'precedente' ? 'Page précédente' : 'Page suivante';
  return `
    <button
      type="button"
      class="pagination__lien pagination__lien--fleche"
      data-action="${ACTION_PAGE}"
      data-page="${page}"
      ${actif ? '' : 'disabled'}
      title="${escapeHtml(libelle)}"
    >
      ${icone(sens === 'precedente' ? 'fleche' : 'flecheDroite')}
      <span class="sr-only">${escapeHtml(libelle)}</span>
    </button>
  `;
}

/** Pied du registre : position dans les resultats, puis navigation. */
export function pagination(courante: number, total: number): string {
  const pages = nombrePages(total);
  if (pages <= 1) return '';

  const premier = (courante - 1) * PAR_PAGE + 1;
  const dernier = Math.min(courante * PAR_PAGE, total);

  const numeros = numerosPages(courante, pages)
    .map((page) =>
      page === null
        ? '<span class="pagination__ellipse" aria-hidden="true">…</span>'
        : lien(page, courante),
    )
    .join('');

  return `
    <nav class="pagination" aria-label="Pagination des offres">
      <p class="pagination__position">
        <span class="chiffre">${premier}-${dernier}</span> sur
        <span class="chiffre">${total}</span>
      </p>

      <div class="pagination__controles">
        ${fleche(courante - 1, courante > 1, 'precedente')}
        ${numeros}
        ${fleche(courante + 1, courante < pages, 'suivante')}
      </div>
    </nav>
  `;
}
