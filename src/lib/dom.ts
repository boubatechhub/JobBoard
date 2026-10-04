/** Helpers DOM partages par les composants. */

/**
 * Echappe une chaine avant injection dans un template HTML.
 * Obligatoire pour toute donnee provenant d'une offre ou de la saisie
 * utilisateur : les composants construisent leur markup via innerHTML.
 */
export function escapeHtml(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Selectionne un element et echoue explicitement s'il est absent du DOM. */
export function requireElement<T extends Element>(
  selecteur: string,
  racine: ParentNode = document,
): T {
  const element = racine.querySelector<T>(selecteur);
  if (!element) {
    throw new Error(`Element introuvable dans le DOM : ${selecteur}`);
  }
  return element;
}
