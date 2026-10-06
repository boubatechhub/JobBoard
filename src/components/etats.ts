import { escapeHtml } from '../lib/dom';

/**
 * Etats transverses : chargement, resultat vide, erreur.
 * Le squelette reprend exactement la trame d'une ligne d'offre pour que rien
 * ne bouge quand les vraies donnees arrivent.
 */

export function etatChargement(nombre = 7): string {
  const os = Array.from(
    { length: nombre },
    () => `
      <div class="squelette-ligne">
        <div class="os os--marque"></div>
        <div>
          <div class="os os--titre"></div>
          <div class="os os--ligne"></div>
          <div class="os os--faits"></div>
          <div class="os os--ligne"></div>
        </div>
        <div><div class="os os--cote"></div></div>
      </div>
    `,
  ).join('');

  return `
    <div class="registre" role="status" aria-busy="true">
      <span class="sr-only">Chargement des offres</span>
      ${os}
    </div>
  `;
}

export interface OptionsEtatMessage {
  titre: string;
  texte: string;
  /** Bouton optionnel, lu par la delegation d'evenements de la page. */
  action?: { libelle: string; nom: string };
}

/** Etat neutre, partage par les pages : un titre, une explication, une sortie. */
export function etatMessage({ titre, texte, action }: OptionsEtatMessage): string {
  const bouton = action
    ? `<button type="button" class="bouton bouton--secondaire etat__action" data-action="${escapeHtml(
        action.nom,
      )}">${escapeHtml(action.libelle)}</button>`
    : '';

  return `
    <div class="etat" role="status">
      <p class="etat__titre">${escapeHtml(titre)}</p>
      <p class="etat__texte">${escapeHtml(texte)}</p>
      ${bouton}
    </div>
  `;
}

/** L'etat vide explique quoi faire, il ne constate pas. */
export function etatVide(criteresActifs: boolean): string {
  if (!criteresActifs) {
    return `
      <div class="etat" role="status">
        <p class="etat__titre">Aucune offre publiée</p>
        <p class="etat__texte">
          Le catalogue est vide pour le moment. Les nouvelles offres apparaissent ici
          dès leur publication.
        </p>
      </div>
    `;
  }

  return `
    <div class="etat" role="status">
      <p class="etat__titre">Rien ne correspond à ces critères</p>
      <p class="etat__texte">
        Essayez de retirer un filtre ou de modifier les mots recherchés.
      </p>
      <button type="button" class="bouton bouton--secondaire etat__action" data-action="reinitialiser">
        Réinitialiser les filtres
      </button>
    </div>
  `;
}

/** @param sujet ce qui n'a pas pu etre charge, au pluriel ("offres", "postes"). */
export function etatErreur(message: string, sujet = 'offres'): string {
  return `
    <div class="registre">
      <div class="etat etat--erreur" role="alert">
        <p class="etat__titre">Les ${escapeHtml(sujet)} n'ont pas pu être chargés</p>
        <p class="etat__texte">${escapeHtml(message)}</p>
        <button type="button" class="bouton bouton--secondaire etat__action" data-action="relancer">
          Réessayer
        </button>
      </div>
    </div>
  `;
}
