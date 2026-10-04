/**
 * Routage minimal par hash : pas de dependance, pas de configuration serveur.
 *
 *   #/            -> recherche
 *   #/offre/:id   -> detail d'une offre
 */

export type Route = { nom: 'recherche' } | { nom: 'detail'; id: string };

export function lireRoute(): Route {
  const hash = window.location.hash.replace(/^#/, '');
  const segments = hash.split('/').filter(Boolean);

  if (segments[0] === 'offre' && segments[1]) {
    return { nom: 'detail', id: decodeURIComponent(segments[1]) };
  }
  return { nom: 'recherche' };
}

export function lienVersOffre(id: string): string {
  return `#/offre/${encodeURIComponent(id)}`;
}

export const LIEN_RECHERCHE = '#/';

/** Enregistre le rendu a executer a chaque changement de route. */
export function demarrerRouteur(rendre: (route: Route) => void): void {
  window.addEventListener('hashchange', () => rendre(lireRoute()));
  rendre(lireRoute());
}
