import './styles/index.css';

import { requireElement } from './lib/dom';
import { chargerSauvegardes } from './services/sauvegardes';
import { chargerOffresConsultees } from './services/offres-consultees';
import { basculerTheme, suivreSysteme } from './lib/theme';
import { ACTION_BASCULER_THEME } from './components/entete';
import { monterPageOffres } from './pages/page-offres';
import { monterChatbot } from './components/chatbot';

const racine = requireElement<HTMLElement>('#app');

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
  chargerOffresConsultees();
  void monterPageOffres(racine);
}

void demarrer();
