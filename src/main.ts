import './styles/index.css';

import { requireElement } from './lib/dom';
import { demarrerRouteur } from './lib/routeur';
import type { Route } from './lib/routeur';
import { chargerSauvegardes } from './services/sauvegardes';
import { basculerTheme, suivreSysteme } from './lib/theme';
import { ACTION_BASCULER_THEME } from './components/entete';
import { ETAT_INITIAL, monterPageRecherche } from './pages/page-recherche';
import type { EtatRecherche } from './pages/page-recherche';
import { monterPageDetail } from './pages/page-detail';
import { monterChatbot } from './components/chatbot';

const racine = requireElement<HTMLElement>('#app');

/**
 * Etat de recherche conserve entre les navigations : revenir du detail vers la
 * liste doit retrouver la recherche, les filtres et le tri precedents.
 */
let etatRecherche: EtatRecherche = ETAT_INITIAL;

function rendre(route: Route): void {
  if (route.nom === 'detail') {
    void monterPageDetail(racine, route.id);
    return;
  }

  void monterPageRecherche({
    racine,
    etat: etatRecherche,
    onEtat: (etat) => {
      etatRecherche = etat;
    },
  });
}

/**
 * Le bouton clair/sombre est recree a chaque page (l'en-tete fait partie de
 * `racine.innerHTML`), mais `racine` elle-meme ne l'est jamais : un seul
 * ecouteur, pose une fois, suffit pour toute la duree de l'application.
 */
function installerBasculeTheme(): void {
  racine.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;
    if (!cible.closest(`[data-action="${ACTION_BASCULER_THEME}"]`)) return;
    basculerTheme();
  });
}

async function demarrer(): Promise<void> {
  suivreSysteme();
  installerBasculeTheme();

  // Hors de `#app` : le chatbot ne doit pas etre recree a chaque navigation,
  // au risque de perdre l'historique affiche et d'empiler ses ecouteurs.
  monterChatbot(requireElement<HTMLElement>('#chatbot'));

  // Les offres sauvegardees doivent etre connues avant le premier rendu, sans
  // quoi les cartes s'afficheraient brievement comme non sauvegardees.
  await chargerSauvegardes();
  demarrerRouteur(rendre);
}

void demarrer();
