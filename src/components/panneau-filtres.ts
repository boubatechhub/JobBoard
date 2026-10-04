import { TOUS } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { icone } from './icones';

/**
 * Rail de filtres. Rend uniquement le balisage : la lecture de l'etat et les
 * evenements appartiennent a la page, qui possede un formulaire unique.
 *
 * Le flux France Travail ne fournit que le contrat et la date de publication :
 * ce sont les deux seuls criteres. Un filtre ne rejoint ce rail que si la
 * source porte reellement l'information qu'il pretend filtrer.
 */

function optionsListe(nom: string, valeurs: readonly string[], libelleTous: string): string {
  const ligne = (valeur: string, libelle: string, coche: boolean): string => `
    <li>
      <label class="option">
        <input type="radio" name="${escapeHtml(nom)}" value="${escapeHtml(valeur)}" class="sr-only" ${
          coche ? 'checked' : ''
        } />
        <span class="option__nom">${escapeHtml(libelle)}</span>
        <span class="option__compte chiffre" data-compte="${escapeHtml(valeur)}"></span>
      </label>
    </li>
  `;

  return `
    <ul class="options">
      ${ligne(TOUS, libelleTous, true)}
      ${valeurs.map((valeur) => ligne(valeur, valeur, false)).join('')}
    </ul>
  `;
}

function pilules(nom: string, valeurs: { valeur: string; libelle: string }[]): string {
  const items = valeurs
    .map(
      (option, index) => `
        <label class="pilule">
          <input
            type="radio"
            name="${escapeHtml(nom)}"
            value="${escapeHtml(option.valeur)}"
            class="sr-only"
            ${index === 0 ? 'checked' : ''}
          />
          <span>${escapeHtml(option.libelle)}</span>
        </label>
      `,
    )
    .join('');

  return `<div class="pilules">${items}</div>`;
}

export function panneauFiltres(contrats: string[]): string {
  return `
    <aside class="rail" id="rail-filtres" aria-label="Filtres de recherche">
      <div class="rail__tete">
        <h2 class="rail__titre">Filtres</h2>
        <button type="reset" class="bouton bouton--texte">Tout effacer</button>
        <button type="button" class="signet rail__fermer" data-action="fermer-filtres">
          ${icone('croix')}<span class="sr-only">Fermer les filtres</span>
        </button>
      </div>

      <fieldset class="groupe">
        <legend class="groupe__titre">Type de contrat</legend>
        ${optionsListe('contractType', contrats, 'Tous les contrats')}
      </fieldset>

      <fieldset class="groupe">
        <legend class="groupe__titre">Publication</legend>
        ${pilules('publiee', [
          { valeur: TOUS, libelle: 'Peu importe' },
          { valeur: '1', libelle: '24 h' },
          { valeur: '7', libelle: '7 jours' },
          { valeur: '14', libelle: '14 jours' },
          { valeur: '30', libelle: '30 jours' },
        ])}
      </fieldset>

      <div class="rail__pied">
        <button
          type="button"
          class="bouton bouton--primaire bouton--grand"
          data-action="fermer-filtres"
          id="voir-resultats"
        >
          Voir les résultats
        </button>
      </div>
    </aside>
  `;
}

/**
 * Met a jour les decomptes de contrat sans re-rendre le rail : on touche au
 * texte, jamais au DOM des controles, pour ne perdre ni le focus ni un menu
 * ouvert. Un contrat sans resultat est desactive plutot que masque, la liste
 * reste lisible.
 */
export function majDecomptes(
  racine: ParentNode,
  comptes: Map<string, number>,
  selection: string,
): void {
  for (const element of racine.querySelectorAll<HTMLElement>('[data-compte]')) {
    const cle = element.dataset['compte'] ?? '';
    const nombre = comptes.get(cle) ?? 0;
    element.textContent = String(nombre);

    const controle = element.closest('label')?.querySelector('input');
    if (controle instanceof HTMLInputElement) {
      controle.disabled = nombre === 0 && cle !== selection;
    }
  }
}
