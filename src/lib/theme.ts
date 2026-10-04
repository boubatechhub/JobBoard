/**
 * Theme clair / sombre.
 *
 * Le script inline d'`index.html` resout et pose l'attribut `data-theme` sur
 * `<html>` avant le premier paint (choix memorise, sinon preference systeme) :
 * aucun flash au chargement. Ce module maintient cet attribut a jour et
 * expose la bascule manuelle ; toutes les couleurs suivent depuis
 * `styles/tokens.css`, qui ne lit que cet attribut.
 */

export type Theme = 'light' | 'dark';

const CLE_STOCKAGE = 'alternance.theme';

function lireChoixExplicite(): Theme | null {
  try {
    const valeur = window.localStorage.getItem(CLE_STOCKAGE);
    return valeur === 'light' || valeur === 'dark' ? valeur : null;
  } catch {
    return null;
  }
}

function ecrireChoixExplicite(theme: Theme): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, theme);
  } catch {
    // Navigation privee ou quota depasse : le theme reste correct pour la
    // session, simplement pas retenu a la prochaine visite.
  }
}

function appliquer(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/** Theme actuellement applique a `<html>`. */
export function themeActif(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

/** Bascule vers l'oppose du theme actif et memorise le choix explicitement. */
export function basculerTheme(): Theme {
  const suivant: Theme = themeActif() === 'dark' ? 'light' : 'dark';
  ecrireChoixExplicite(suivant);
  appliquer(suivant);
  return suivant;
}

/**
 * Suit les changements de preference systeme tant que l'utilisateur n'a fait
 * aucun choix explicite dans l'application. Des qu'il bascule une fois, ce
 * suivi s'arrete de lui-meme : `lireChoixExplicite()` n'est plus vide.
 */
export function suivreSysteme(): void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (evenement) => {
    if (lireChoixExplicite()) return;
    appliquer(evenement.matches ? 'dark' : 'light');
  });
}
