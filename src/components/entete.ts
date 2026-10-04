import { escapeHtml } from '../lib/dom';
import { LIEN_RECHERCHE } from '../lib/routeur';
import { icone, signeMarque } from './icones';

/** Bloc de marque, commun a toutes les pages. */
export function marque(): string {
  return `
    <a class="marque" href="${LIEN_RECHERCHE}">
      <span class="marque__signe">${signeMarque()}</span>
      <span>JobBoard</span>
    </a>
  `;
}

/** Action reconnue par la delegation d'evenements globale (voir main.ts). */
export const ACTION_BASCULER_THEME = 'basculer-theme';

/**
 * Bouton clair / sombre, identique sur toutes les pages.
 * Les deux icones sont presentes en permanence ; seule la CSS pilotee par
 * `[data-theme]` decide laquelle se montre, ce qui evite un re-rendu JS du
 * bouton apres bascule (l'en-tete entier est recree a chaque changement de
 * page, un etat garde en JS s'y perdrait).
 */
function boutonTheme(): string {
  return `
    <button
      type="button"
      class="bascule-theme"
      data-action="${ACTION_BASCULER_THEME}"
      title="Changer de thème"
    >
      <span class="bascule-theme__icone bascule-theme__icone--clair">${icone('soleil')}</span>
      <span class="bascule-theme__icone bascule-theme__icone--sombre">${icone('lune')}</span>
      <span class="sr-only">Changer de thème</span>
    </button>
  `;
}

/**
 * Barre haute de la recherche : marque, champ de recherche, acces aux offres
 * sauvegardees. Le champ et la bascule appartiennent au formulaire unique de la
 * page, d'ou l'absence de gestionnaire d'evenement ici.
 *
 * Le champ est l'ancre de la page : toujours visible, atteignable au clavier
 * par la touche « / ».
 */
export function enteteRecherche(nombreSauvegardees: number): string {
  return `
    <header class="entete">
      <div class="entete__contenu">
        ${marque()}

        <div class="quete">
          <label class="sr-only" for="champ-recherche">Rechercher une offre</label>
          <span class="quete__icone">${icone('loupe')}</span>
          <input
            class="quete__champ"
            type="search"
            id="champ-recherche"
            name="recherche"
            placeholder="Poste, référence, mot-clé"
            autocomplete="off"
          />
          <kbd class="quete__touche">/</kbd>
        </div>

        <label class="bascule">
          <input type="checkbox" name="sauvegardees" class="sr-only" />
          <span class="bascule__corps">
            ${icone('signet')}
            <span>Sauvegardées</span>
            <span class="bascule__compteur chiffre" id="compteur-sauvegardees">${escapeHtml(
              String(nombreSauvegardees),
            )}</span>
          </span>
        </label>

        ${boutonTheme()}
      </div>
    </header>
  `;
}

/** Barre haute des pages secondaires. */
export function enteteSimple(): string {
  return `
    <header class="entete">
      <div class="entete__contenu">${marque()}${boutonTheme()}</div>
    </header>
  `;
}
