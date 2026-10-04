import { contientTableau, parserPostes } from '../lib/france-travail';
import type { PosteOuvert } from '../types/france-travail';

/**
 * Acces au flux des postes ouverts chez France Travail.
 *
 * Contrairement a `services/jobs.ts`, ce module ne garde aucun cache : les
 * annonces changent, et l'utilisateur qui recharge la page ou clique sur
 * « Réessayer » attend l'etat courant du flux, pas celui d'il y a dix minutes.
 * Chaque appel va au reseau.
 *
 * Le parsing vit dans `lib/france-travail.ts` ; ce module ne fait que parler au
 * reseau et traduire les echecs en messages lisibles.
 */

const ENDPOINT = 'https://hook.eu1.make.com/metv1xuy3a0yqk2vx7tkxabn94pdwug4';

/** Un webhook Make peut mettre plusieurs secondes a repondre, mais pas trente. */
const DELAI_MAX_MS = 15_000;

/**
 * Messages orientes action : l'utilisateur doit savoir quoi en faire.
 * Le corps compte autant que le statut, Make y met son diagnostic.
 */
function messageErreur(statut: number, corps: string): string {
  if (/queue is full/i.test(corps)) {
    return (
      'La file d’attente du webhook Make est pleine : les appels s’y empilent sans ' +
      'être traités. Le scénario est à l’arrêt, il faut le réactiver pour qu’il ' +
      'consomme la file.'
    );
  }
  if (statut === 410 || statut === 404) {
    return 'Le scénario Make ne répond plus. Il doit être réactivé côté Make pour que les postes remontent.';
  }
  if (statut >= 500) {
    return 'Le service Make est momentanément indisponible. Réessayez dans un instant.';
  }
  return `Le service a répondu ${statut}.`;
}

export async function listerPostesOuverts(): Promise<PosteOuvert[]> {
  const arret = AbortSignal.timeout(DELAI_MAX_MS);

  let reponse: Response;
  try {
    reponse = await fetch(ENDPOINT, {
      signal: arret,
      headers: { Accept: 'application/json' },
      // Le flux change, et Make ne pose aucun en-tete de cache. Sans cela le
      // navigateur garde la reponse : un 410 recu pendant une panne du
      // scenario resterait servi longtemps apres son retablissement.
      cache: 'no-store',
    });
  } catch (erreur) {
    if (erreur instanceof DOMException && erreur.name === 'TimeoutError') {
      throw new Error('Le service met trop de temps à répondre.');
    }
    throw new Error('Impossible de joindre le service. Vérifiez votre connexion.');
  }

  // Un webhook Make repond 200 meme quand le scenario ne renvoie rien, et
  // glisse son diagnostic dans le corps meme en erreur : on lit d'abord, on
  // interprete ensuite.
  const brut = (await reponse.text()).trim();

  if (!reponse.ok) {
    throw new Error(messageErreur(reponse.status, brut));
  }

  // Accuse de reception par defaut de Make : le scenario tourne, mais aucun
  // module « Webhook response » ne renvoie les donnees en fin de parcours.
  if (/^accepted$/i.test(brut)) {
    throw new Error(
      'Le scénario Make s’exécute mais ne renvoie aucune donnée. Il lui manque un ' +
        'module « Webhook response » qui retourne le JSON en fin de scénario.',
    );
  }

  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    throw new Error("La réponse du service n'est pas du JSON exploitable.");
  }

  if (!contientTableau(donnees)) {
    throw new Error(
      "La réponse ne contient pas de liste d'annonces exploitable. Vérifiez ce que " +
        'renvoie le module « Webhook response ».',
    );
  }

  return parserPostes(donnees);
}
