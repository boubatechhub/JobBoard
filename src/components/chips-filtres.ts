import { TOUS } from '../types/job';
import type { Filtres } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { icone } from './icones';

/** Action reconnue par la delegation d'evenements de la page. */
export const ACTION_RETIRER = 'retirer-filtre';

interface Chip {
  /** Nom du champ de formulaire a remettre a zero. */
  champ: string;
  libelle: string;
}

const LIBELLES_FENETRE: Record<string, string> = {
  '1': 'Publiées sous 24 h',
  '7': 'Publiées sous 7 jours',
  '30': 'Publiées sous 30 jours',
};

function construireChips(filtres: Filtres): Chip[] {
  const chips: Chip[] = [];

  if (filtres.sauvegardees) chips.push({ champ: 'sauvegardees', libelle: 'Offres sauvegardées' });
  if (filtres.recherche.trim())
    chips.push({ champ: 'recherche', libelle: `« ${filtres.recherche.trim()} »` });
  if (filtres.contractType !== TOUS) {
    chips.push({ champ: 'contractType', libelle: filtres.contractType });
  }
  if (filtres.source !== TOUS) {
    chips.push({
      champ: 'source',
      libelle: filtres.source === 'airfrance' ? 'Air France' : 'France Travail',
    });
  }
  if (filtres.publiee !== TOUS) {
    chips.push({
      champ: 'publiee',
      libelle: LIBELLES_FENETRE[filtres.publiee] ?? 'Offres récentes',
    });
  }

  return chips;
}

/** Les criteres actifs, retirables un par un. */
export function chipsFiltres(filtres: Filtres): string {
  const chips = construireChips(filtres);
  if (chips.length === 0) return '';

  const contenu = chips
    .map(
      (chip) => `
        <li>
          <button
            type="button"
            class="chip"
            data-action="${ACTION_RETIRER}"
            data-champ="${escapeHtml(chip.champ)}"
          >
            <span>${escapeHtml(chip.libelle)}</span>
            ${icone('croix')}
            <span class="sr-only">Retirer ce critère</span>
          </button>
        </li>
      `,
    )
    .join('');

  return `
    <div class="chips-actifs">
      <ul class="chips" aria-label="Critères actifs">${contenu}</ul>
      <button type="button" class="bouton bouton--texte" data-action="tout-effacer">Tout effacer</button>
    </div>
  `;
}
