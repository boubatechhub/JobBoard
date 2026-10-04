import { escapeHtml, requireElement } from '../lib/dom';
import { rendreMarkdownLeger } from '../lib/markdown-leger';
import { poserQuestion } from '../services/chatbot';
import { icone } from './icones';

/**
 * Assistant de recherche d'emploi : bulle flottante, panneau de conversation.
 *
 * Monte une seule fois pour toute la duree de l'application, sur un noeud
 * hors de `#app` (voir `main.ts`) : la zone racine des pages est recreee a
 * chaque navigation, ce widget ne doit pas l'etre, sous peine de perdre
 * l'historique affiche et de reposer un jeu d'ecouteurs par page visitee.
 */

interface MessageVisiteur {
  role: 'visiteur';
  texte: string;
}

interface MessageAssistant {
  role: 'assistant';
  texte: string;
}

interface MessageErreur {
  role: 'erreur';
  texte: string;
  /** Question a reposer si l'utilisateur clique sur "Reessayer". */
  question: string;
}

type EntreeFil = MessageVisiteur | MessageAssistant | MessageErreur;

const ACCUEIL =
  "Bonjour, je suis l'assistant de recherche d'emploi. Je peux t'aider sur ton CV, " +
  'ta lettre de motivation, un entretien à venir ou ta stratégie de candidature. ' +
  'Pose ta question.';

const SUGGESTIONS = [
  'Comment structurer mon CV ?',
  'Comment me préparer à un entretien ?',
  'Comment rédiger une lettre de motivation ?',
  "Où trouver des offres d'alternance ?",
];

const ID_ATTENTE = 'chatbot-attente';

function gabarit(): string {
  const suggestions = SUGGESTIONS.map(
    (question) => `
      <li>
        <button
          type="button"
          class="chatbot__suggestion"
          data-action="poser-suggestion"
          data-question="${escapeHtml(question)}"
        >${escapeHtml(question)}</button>
      </li>
    `,
  ).join('');

  return `
    <button
      type="button"
      class="chatbot__declencheur"
      data-action="ouvrir-chatbot"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-controls="chatbot-panneau"
    >
      ${icone('bulle')}
      <span class="sr-only">Ouvrir l'assistant de recherche d'emploi</span>
    </button>

    <section
      class="chatbot__panneau"
      id="chatbot-panneau"
      role="dialog"
      aria-modal="false"
      aria-labelledby="chatbot-titre"
      hidden
    >
      <header class="chatbot__entete">
        <h2 class="chatbot__titre" id="chatbot-titre">Assistant de recherche d'emploi</h2>
        <button
          type="button"
          class="signet"
          data-action="fermer-chatbot"
          aria-label="Fermer l'assistant"
        >${icone('croix')}</button>
      </header>

      <div class="chatbot__fil" id="chatbot-fil" role="log" aria-live="polite" aria-label="Conversation">
        <div class="chatbot__message chatbot__message--assistant">
          <div class="chatbot__bulle">${escapeHtml(ACCUEIL)}</div>
        </div>
        <ul class="chatbot__suggestions" id="chatbot-suggestions">${suggestions}</ul>
      </div>

      <form class="chatbot__formulaire" id="chatbot-formulaire">
        <label class="sr-only" for="chatbot-champ">Votre message</label>
        <textarea
          class="chatbot__champ"
          id="chatbot-champ"
          rows="1"
          placeholder="Écris ta question…"
          aria-describedby="chatbot-aide"
        ></textarea>
        <button type="submit" class="chatbot__envoyer" aria-label="Envoyer">
          ${icone('envoyer')}
        </button>
      </form>
      <p class="sr-only" id="chatbot-aide">Entrée pour envoyer, Maj et Entrée pour un saut de ligne.</p>
    </section>
  `;
}

function rendreMessage(entree: EntreeFil): string {
  if (entree.role === 'erreur') {
    return `
      <div class="chatbot__message chatbot__message--erreur" role="alert">
        <div class="chatbot__bulle">${escapeHtml(entree.texte)}</div>
        <button
          type="button"
          class="bouton bouton--secondaire chatbot__reessayer"
          data-action="reessayer-question"
          data-question="${escapeHtml(entree.question)}"
        >Réessayer</button>
      </div>
    `;
  }

  const contenu =
    entree.role === 'assistant' ? rendreMarkdownLeger(entree.texte) : escapeHtml(entree.texte);

  return `
    <div class="chatbot__message chatbot__message--${entree.role}">
      <div class="chatbot__bulle">${contenu}</div>
    </div>
  `;
}

const ATTENTE_HTML = `
  <div class="chatbot__message chatbot__message--assistant" id="${ID_ATTENTE}" aria-hidden="true">
    <div class="chatbot__bulle chatbot__points"><span></span><span></span><span></span></div>
  </div>
`;

export function monterChatbot(racine: HTMLElement): void {
  racine.innerHTML = gabarit();

  const declencheur = requireElement<HTMLButtonElement>('[data-action="ouvrir-chatbot"]', racine);
  const panneau = requireElement<HTMLElement>('#chatbot-panneau', racine);
  const boutonFermer = requireElement<HTMLButtonElement>('[data-action="fermer-chatbot"]', racine);
  const fil = requireElement<HTMLElement>('#chatbot-fil', racine);
  const formulaire = requireElement<HTMLFormElement>('#chatbot-formulaire', racine);
  const champ = requireElement<HTMLTextAreaElement>('#chatbot-champ', racine);
  const boutonEnvoyer = requireElement<HTMLButtonElement>('.chatbot__envoyer', racine);

  let enAttente = false;
  let dernierFocus: HTMLElement | null = null;

  function deposer(entree: EntreeFil): void {
    fil.insertAdjacentHTML('beforeend', rendreMessage(entree));
    fil.scrollTop = fil.scrollHeight;
  }

  function masquerSuggestions(): void {
    requireElement<HTMLElement>('#chatbot-suggestions', racine).remove();
  }

  function definirAttente(actif: boolean): void {
    enAttente = actif;
    champ.disabled = actif;
    boutonEnvoyer.disabled = actif;

    if (actif) {
      fil.insertAdjacentHTML('beforeend', ATTENTE_HTML);
    } else {
      racine.querySelector(`#${ID_ATTENTE}`)?.remove();
    }
    fil.scrollTop = fil.scrollHeight;
  }

  function ouvrir(): void {
    dernierFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panneau.hidden = false;
    declencheur.setAttribute('aria-expanded', 'true');
    champ.focus();
  }

  function refermer(): void {
    panneau.hidden = true;
    declencheur.setAttribute('aria-expanded', 'false');
    (dernierFocus ?? declencheur).focus();
  }

  async function envoyer(question: string): Promise<void> {
    const propre = question.trim();
    // Question vide ou uniquement des espaces : on ne renvoie rien.
    if (!propre || enAttente) return;

    if (racine.querySelector('#chatbot-suggestions')) masquerSuggestions();

    deposer({ role: 'visiteur', texte: propre });
    definirAttente(true);

    try {
      const reponse = await poserQuestion(propre);
      definirAttente(false);
      deposer({ role: 'assistant', texte: reponse });
    } catch (erreur) {
      definirAttente(false);
      const message =
        erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.';
      deposer({ role: 'erreur', texte: message, question: propre });
    }
  }

  declencheur.addEventListener('click', () => {
    if (panneau.hidden) ouvrir();
    else refermer();
  });

  boutonFermer.addEventListener('click', refermer);

  // stopPropagation : evite que l'ecouteur Echap global de la page de
  // recherche (qui gere son propre panneau de filtres) ne reagisse en meme
  // temps que celui-ci.
  panneau.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape') return;
    evenement.stopPropagation();
    refermer();
  });

  // Entree envoie, Maj+Entree saute une ligne : comportement standard de
  // messagerie, attendu sans avoir a le decouvrir.
  champ.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Enter' && !evenement.shiftKey) {
      evenement.preventDefault();
      formulaire.requestSubmit();
    }
  });

  formulaire.addEventListener('submit', (evenement) => {
    evenement.preventDefault();
    const question = champ.value;
    champ.value = '';
    void envoyer(question);
  });

  // Delegation : suggestions de depart et bouton "Reessayer" partagent la
  // meme mecanique, la question a poser voyage dans `data-question`.
  fil.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;

    const bouton = cible.closest<HTMLElement>('[data-action]');
    if (!bouton) return;

    const action = bouton.dataset['action'];
    if (action !== 'poser-suggestion' && action !== 'reessayer-question') return;

    const question = bouton.dataset['question'];
    if (question) void envoyer(question);
  });
}
