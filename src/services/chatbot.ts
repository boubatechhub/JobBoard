/**
 * Acces au webhook Make de l'assistant de recherche d'emploi.
 *
 * Contrat impose par l'agent, a respecter au caractere pres :
 * - GET uniquement, `q` et `sid` en parametres d'URL, tous deux encodes avec
 *   encodeURIComponent. Un POST ou un en-tete Content-Type personnalise
 *   declencherait une requete preliminaire OPTIONS que le webhook Make ne
 *   traite pas, et l'appel echouerait en CORS. Aucun en-tete n'est donc pose
 *   sur la requete.
 * - La reponse est du texte brut, pas du JSON : lecture avec `.text()`.
 * - Le `sid` porte la memoire de la conversation cote serveur. Il est genere
 *   une seule fois, conserve en sessionStorage, et ne doit jamais etre
 *   recree en cours de session, sans quoi l'agent perdrait le fil.
 */

const ENDPOINT = 'https://hook.eu1.make.com/kkaj2rhyuu9hw93m663viq39ed6fjio5';
const CLE_SESSION = 'alternance.chatbot.sid';

/** L'agent reflechit avant de repondre (5 a 15 s typique) : large marge avant abandon. */
const DELAI_MAX_MS = 45_000;

/**
 * Identifiant de session, stable pour toute la duree de l'onglet.
 * Lu s'il existe deja, genere sinon : jamais recree une fois pose.
 */
export function idSession(): string {
  try {
    const existant = window.sessionStorage.getItem(CLE_SESSION);
    if (existant) return existant;

    const nouveau = crypto.randomUUID();
    window.sessionStorage.setItem(CLE_SESSION, nouveau);
    return nouveau;
  } catch {
    // Navigation privee ou quota depasse : la session fonctionne quand meme,
    // elle ne survivra simplement pas a un rechargement de la page.
    return crypto.randomUUID();
  }
}

/** Messages orientes action, sur le meme principe que `services/france-travail.ts`. */
function messageErreur(statut: number): string {
  if (statut === 410 || statut === 404) {
    return "L'assistant n'est pas disponible pour le moment.";
  }
  if (statut >= 500) {
    return "Le service de l'assistant rencontre un problème. Réessayez dans un instant.";
  }
  return `Le service a répondu ${statut}.`;
}

/**
 * Pose une question a l'assistant et attend sa reponse en texte brut.
 * Seule fonction du fichier a toucher au reseau : le composant d'affichage ne
 * connait que cette signature.
 */
export async function poserQuestion(question: string): Promise<string> {
  const url = `${ENDPOINT}?q=${encodeURIComponent(question)}&sid=${encodeURIComponent(idSession())}`;

  let reponse: Response;
  try {
    reponse = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(DELAI_MAX_MS),
    });
  } catch (erreur) {
    if (erreur instanceof DOMException && erreur.name === 'TimeoutError') {
      throw new Error("L'assistant met trop de temps à répondre.");
    }
    throw new Error("Impossible de joindre l'assistant. Vérifiez votre connexion.");
  }

  if (!reponse.ok) {
    throw new Error(messageErreur(reponse.status));
  }

  const texte = (await reponse.text()).trim();

  // Accuse de reception par defaut de Make quand le scenario ne renvoie rien :
  // meme cause que pour le flux France Travail, meme diagnostic a donner.
  if (/^accepted$/i.test(texte)) {
    throw new Error("L'assistant n'a pas répondu. Réessayez dans un instant.");
  }

  return texte || "L'assistant n'a rien renvoyé cette fois. Réessayez.";
}
