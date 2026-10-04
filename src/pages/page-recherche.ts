import { FILTRES_VIDES, TOUS } from '../types/job';
import type { CritereTri, Filtres, Job } from '../types/job';
import {
  compterFiltresActifs,
  compterParContrat,
  contratsDisponibles,
  rechercherJobs,
} from '../lib/recherche';
import { accorderOffres } from '../lib/format';
import { requireElement } from '../lib/dom';
import { listerJobs } from '../services/jobs';
import {
  basculerSauvegarde,
  compterSauvegardes,
  identifiantsSauvegardes,
} from '../services/sauvegardes';
import { enteteRecherche } from '../components/entete';
import { majDecomptes, panneauFiltres } from '../components/panneau-filtres';
import { listeJobs } from '../components/liste-jobs';
import { ACTION_PAGE, nombrePages } from '../components/pagination';
import { ACTION_RETIRER, chipsFiltres } from '../components/chips-filtres';
import { ACTION_SAUVEGARDE } from '../components/bouton-signet';
import { etatChargement, etatErreur } from '../components/etats';
import { icone } from '../components/icones';

export interface EtatRecherche {
  filtres: Filtres;
  tri: CritereTri;
}

export const ETAT_INITIAL: EtatRecherche = {
  filtres: { ...FILTRES_VIDES },
  tri: 'pertinence',
};

const CLASSE_FILTRES_OUVERTS = 'layout--filtres-ouverts';

/** Squelette de la page, rendu avant meme que les offres soient disponibles. */
function gabarit(nombreSauvegardees: number): string {
  return `
    ${enteteRecherche(nombreSauvegardees)}

    <main class="layout" id="layout">
      <div class="voile" data-action="fermer-filtres" aria-hidden="true"></div>
      <div id="zone-filtres"></div>

      <section class="resultats" aria-label="Résultats">
        <div class="resultats__tete">
          <div>
            <h1 class="resultats__titre">Offres</h1>
            <p class="resultats__compteur" id="compteur" aria-live="polite">Chargement</p>
          </div>

          <div class="barre-mobile">
            <button
              type="button"
              class="bouton bouton--secondaire"
              data-action="ouvrir-filtres"
              aria-controls="rail-filtres"
              aria-expanded="false"
            >
              ${icone('reglages')} Filtres <span class="chiffre" id="compteur-filtres"></span>
            </button>
          </div>

          <div class="tri">
            <label for="tri">Trier</label>
            <select class="controle" id="tri" name="tri">
              <option value="pertinence">Pertinence</option>
              <option value="recent">Plus récentes</option>
              <option value="ancien">Plus anciennes</option>
            </select>
          </div>
        </div>

        <div id="zone-chips"></div>
        <div id="zone-liste">${etatChargement()}</div>
      </section>
    </main>
  `;
}

/** Lit l'integralite de l'etat depuis le formulaire unique de la page. */
function lireEtat(formulaire: HTMLFormElement): EtatRecherche {
  const donnees = new FormData(formulaire);
  const valeur = (champ: string): string => String(donnees.get(champ) ?? '');

  return {
    filtres: {
      recherche: valeur('recherche'),
      contractType: valeur('contractType') as Filtres['contractType'],
      publiee: valeur('publiee') as Filtres['publiee'],
      sauvegardees: donnees.get('sauvegardees') !== null,
    },
    tri: valeur('tri') as CritereTri,
  };
}

/** Reapplique l'etat memorise au formulaire (retour depuis la fiche). */
function appliquerEtat(formulaire: HTMLFormElement, etat: EtatRecherche): void {
  const definir = (nom: string, valeur: string): void => {
    const champ = formulaire.elements.namedItem(nom);
    if (
      champ instanceof HTMLInputElement ||
      champ instanceof HTMLSelectElement ||
      champ instanceof RadioNodeList
    ) {
      champ.value = valeur;
    }
  };

  const { filtres, tri } = etat;
  definir('recherche', filtres.recherche);
  definir('contractType', filtres.contractType);
  definir('publiee', filtres.publiee);
  definir('tri', tri);

  const sauvegardees = formulaire.elements.namedItem('sauvegardees');
  if (sauvegardees instanceof HTMLInputElement) {
    sauvegardees.checked = filtres.sauvegardees;
  }
}

/** Remet un champ a sa valeur neutre, depuis une pastille de critere actif. */
function reinitialiserChamp(formulaire: HTMLFormElement, nom: string): void {
  const champ = formulaire.elements.namedItem(nom);

  if (champ instanceof HTMLInputElement && champ.type === 'checkbox') {
    champ.checked = false;
    return;
  }
  if (champ instanceof HTMLSelectElement || champ instanceof RadioNodeList) {
    champ.value = TOUS;
  }
}

/**
 * Raccourcis clavier de la recherche, installes une seule fois pour la session.
 * « / » place le curseur dans le champ, « Echap » efface la saisie ou referme
 * le panneau de filtres. Aucun mouvement associe : ces gestes se repetent des
 * dizaines de fois par session.
 */
let raccourcisInstalles = false;

function installerRaccourcis(): void {
  if (raccourcisInstalles) return;
  raccourcisInstalles = true;

  document.addEventListener('keydown', (evenement) => {
    const champ = document.querySelector<HTMLInputElement>('#champ-recherche');
    if (!champ) return;

    const cible = evenement.target;
    const dansUnChamp =
      cible instanceof HTMLInputElement ||
      cible instanceof HTMLTextAreaElement ||
      cible instanceof HTMLSelectElement;

    if (evenement.key === '/' && !dansUnChamp) {
      evenement.preventDefault();
      champ.focus();
      champ.select();
      return;
    }

    if (evenement.key !== 'Escape') return;

    const layout = document.querySelector<HTMLElement>('#layout');
    if (layout?.classList.contains(CLASSE_FILTRES_OUVERTS)) {
      layout.classList.remove(CLASSE_FILTRES_OUVERTS);
      document
        .querySelector<HTMLElement>('[data-action="ouvrir-filtres"]')
        ?.setAttribute('aria-expanded', 'false');
      return;
    }

    if (cible === champ && champ.value) {
      champ.value = '';
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}

export interface OptionsPageRecherche {
  racine: HTMLElement;
  etat: EtatRecherche;
  /** Remonte l'etat courant pour qu'il survive a la navigation. */
  onEtat: (etat: EtatRecherche) => void;
}

/**
 * Monte la page de recherche.
 *
 * Le formulaire est monte une seule fois et englobe la barre haute, le rail et
 * le tri : un `FormData` suffit a lire tout l'etat, et seul le registre est
 * re-rendu, donc le champ de recherche ne perd jamais le focus.
 */
export async function monterPageRecherche({
  racine,
  etat,
  onEtat,
}: OptionsPageRecherche): Promise<void> {
  racine.innerHTML = `<form id="formulaire-recherche">${gabarit(compterSauvegardes())}</form>`;

  const formulaire = requireElement<HTMLFormElement>('#formulaire-recherche', racine);
  const zoneFiltres = requireElement<HTMLElement>('#zone-filtres', racine);
  const zoneListe = requireElement<HTMLElement>('#zone-liste', racine);
  const zoneChips = requireElement<HTMLElement>('#zone-chips', racine);
  const compteur = requireElement<HTMLElement>('#compteur', racine);
  const compteurFiltres = requireElement<HTMLElement>('#compteur-filtres', racine);
  const compteurSauvegardees = requireElement<HTMLElement>('#compteur-sauvegardees', racine);
  const layout = requireElement<HTMLElement>('#layout', racine);
  const resultatsSection = requireElement<HTMLElement>('.resultats', racine);

  installerRaccourcis();
  formulaire.addEventListener('submit', (evenement) => evenement.preventDefault());

  let jobs: Job[] = [];
  let premierRendu = true;
  let page = 1;

  /**
   * `retourPremierePage` distingue les deux familles d'evenements : changer un
   * critere renvoie au debut des resultats, sauvegarder une offre ou changer de
   * page conserve la position de lecture.
   */
  const rendreResultats = (retourPremierePage = true): void => {
    if (retourPremierePage) page = 1;
    const courant = lireEtat(formulaire);
    onEtat(courant);

    const sauvegardes = new Set(identifiantsSauvegardes());
    const resultats = rechercherJobs(jobs, courant.filtres, courant.tri, sauvegardes);
    const nombreFiltres = compterFiltresActifs(courant.filtres);
    const criteresActifs = nombreFiltres > 0 || courant.filtres.recherche.trim().length > 0;

    compteur.textContent = criteresActifs
      ? `${accorderOffres(resultats.length)} sur ${jobs.length}`
      : `${accorderOffres(resultats.length)} publiées`;

    compteurFiltres.textContent = nombreFiltres > 0 ? String(nombreFiltres) : '';
    const voirResultats = racine.querySelector<HTMLElement>('#voir-resultats');
    if (voirResultats) voirResultats.textContent = `Voir ${accorderOffres(resultats.length)}`;
    compteurSauvegardees.textContent = String(compterSauvegardes());

    zoneChips.innerHTML = chipsFiltres(courant.filtres);
    // Une page videe par un retrait d'offre ne doit pas rester vide.
    page = Math.min(page, nombrePages(resultats.length));
    zoneListe.innerHTML = listeJobs(resultats, sauvegardes, criteresActifs, premierRendu, page);
    premierRendu = false;

    majDecomptes(
      racine,
      compterParContrat(jobs, courant.filtres, sauvegardes),
      courant.filtres.contractType,
    );
  };

  const basculerPanneau = (ouvert: boolean): void => {
    layout.classList.toggle(CLASSE_FILTRES_OUVERTS, ouvert);
    racine
      .querySelector<HTMLElement>('[data-action="ouvrir-filtres"]')
      ?.setAttribute('aria-expanded', String(ouvert));
    if (ouvert) racine.querySelector<HTMLElement>('.rail__fermer')?.focus();
  };

  // Delegation : un seul gestionnaire pour toutes les actions de la page.
  formulaire.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;

    const declencheur = cible.closest<HTMLElement>('[data-action]');
    if (!declencheur) return;

    switch (declencheur.dataset['action']) {
      case ACTION_SAUVEGARDE: {
        const id = declencheur.dataset['id'];
        if (!id) return;
        // Le retour tactile joue tout de suite, l'ecriture suit.
        declencheur.classList.add('est-anime');
        declencheur.addEventListener(
          'animationend',
          () => declencheur.classList.remove('est-anime'),
          { once: true },
        );
        void basculerSauvegarde(id).then(() => rendreResultats(false));
        return;
      }

      case ACTION_RETIRER: {
        const champ = declencheur.dataset['champ'];
        if (!champ) return;
        reinitialiserChamp(formulaire, champ);
        rendreResultats();
        return;
      }

      case 'reinitialiser':
        formulaire.reset();
        window.setTimeout(rendreResultats, 0);
        return;

      case 'ouvrir-filtres':
        basculerPanneau(true);
        return;

      case 'fermer-filtres':
        basculerPanneau(false);
        return;

      case ACTION_PAGE: {
        const demandee = Number(declencheur.dataset['page']);
        if (!demandee || demandee === page) return;
        page = demandee;
        rendreResultats(false);
        // Changer de page fait defiler beaucoup : on ramene le haut des
        // resultats sous la barre, sans animation, le geste se repete.
        resultatsSection.scrollIntoView({ block: 'start' });
        return;
      }

      case 'relancer':
        void charger();
    }
  });

  formulaire.addEventListener('input', () => rendreResultats());
  formulaire.addEventListener('change', () => rendreResultats());
  formulaire.addEventListener('reset', () => {
    // Le reset natif s'applique apres l'evenement : on attend le tour suivant.
    window.setTimeout(() => rendreResultats(), 0);
  });

  async function charger(): Promise<void> {
    zoneListe.innerHTML = etatChargement();

    try {
      jobs = await listerJobs();
      zoneFiltres.innerHTML = panneauFiltres(contratsDisponibles(jobs));
      appliquerEtat(formulaire, etat);
      premierRendu = true;
      rendreResultats();
    } catch (erreur) {
      const message =
        erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.';
      zoneFiltres.innerHTML = '';
      zoneListe.innerHTML = etatErreur(message);
    }
  }

  await charger();
}
