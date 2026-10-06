import { FILTRES_VIDES, TOUS } from '../types/job';
import type { CritereTri, Filtres, Job } from '../types/job';
import { compterFiltresActifs, rechercherJobs } from '../lib/recherche';
import { accorderOffres, formaterCompteur } from '../lib/format';
import { ecrireEtatUrl, lireEtatUrl } from '../lib/etat-recherche';
import { requireElement } from '../lib/dom';
import { listerJobs } from '../services/jobs';
import {
  basculerSauvegarde,
  estSauvegardee,
  identifiantsSauvegardes,
} from '../services/sauvegardes';
import {
  chargerOffresConsultees,
  marquerOffreConsultee,
  offreConsultee,
} from '../services/offres-consultees';
import { enteteSimple } from '../components/entete';
import { barreRecherche } from '../components/barre-recherche';
import { chipsFiltres, ACTION_RETIRER } from '../components/chips-filtres';
import { listeJobs } from '../components/liste-jobs';
import { panneauDetailOffre } from '../components/panneau-detail-offre';
import { etatChargement, etatErreur } from '../components/etats';
import { ACTION_SAUVEGARDE } from '../components/bouton-signet';

const OFFRES_PAR_CHARGEMENT = 20;
const DELAI_RECHERCHE_MS = 250;

function gabarit(): string {
  return `
    ${enteteSimple()}
    <main class="page-offres" id="page-offres">
      <header class="page-offres__intro">
        <h1>Offres d’emploi</h1>
      </header>

      <div class="zone-outils">
        <div class="barre-recherche__champ" role="search" aria-label="Rechercher une offre">
          <label class="sr-only" for="champ-recherche">Métier, mot-clé…</label>
          <input class="controle" type="search" id="champ-recherche" placeholder="Métier, mot-clé…" autocomplete="off" />
        </div>
        <div id="zone-filtres"></div>
        <div id="zone-chips"></div>
      </div>

      <div class="page-offres__resultats">
        <p class="page-offres__compteur" id="compteur" aria-live="polite">Chargement des offres</p>
        <p class="sr-only" id="etat-copie" aria-live="polite"></p>
      </div>

      <div class="jobboard" id="jobboard">
        <section class="jobboard__liste" id="zone-liste" aria-label="Liste des offres">${etatChargement(6)}</section>
        <section class="jobboard__detail" id="zone-detail" aria-label="Détail de l’offre"></section>
      </div>
    </main>
  `;
}

function urlEtat(filtres: Filtres, tri: CritereTri, offre: string | null): string {
  const parametres = ecrireEtatUrl({ filtres, tri, offre });
  const query = parametres.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
}

export async function monterPageOffres(racine: HTMLElement): Promise<void> {
  chargerOffresConsultees();
  racine.innerHTML = gabarit();

  const page = requireElement<HTMLElement>('#page-offres', racine);
  const champRecherche = requireElement<HTMLInputElement>('#champ-recherche', racine);
  const zoneFiltres = requireElement<HTMLElement>('#zone-filtres', racine);
  const zoneChips = requireElement<HTMLElement>('#zone-chips', racine);
  const zoneListe = requireElement<HTMLElement>('#zone-liste', racine);
  const zoneDetail = requireElement<HTMLElement>('#zone-detail', racine);
  const compteur = requireElement<HTMLElement>('#compteur', racine);
  const etatCopie = requireElement<HTMLElement>('#etat-copie', racine);

  const depuisUrl = lireEtatUrl(new URLSearchParams(window.location.search));
  let filtres: Filtres = { ...FILTRES_VIDES, ...depuisUrl.filtres };
  let tri: CritereTri = depuisUrl.tri;
  let jobs: Job[] = [];
  let offreSelectionnee = depuisUrl.offre;
  let detailMobileOuvert = Boolean(depuisUrl.offre);
  let nombreAffichees = OFFRES_PAR_CHARGEMENT;
  let scrollListe = 0;
  let premierRendu = true;
  let minuteurRecherche: number | undefined;

  champRecherche.value = filtres.recherche;

  function persisterUrl(methode: 'pushState' | 'replaceState', offre = offreSelectionnee): void {
    const mobileSansDetail =
      window.matchMedia('(max-width: 1023px)').matches && !detailMobileOuvert;
    window.history[methode]({}, '', urlEtat(filtres, tri, mobileSansDetail ? null : offre));
  }

  function rendre(): void {
    const sauvegardes = new Set(identifiantsSauvegardes());
    const resultats = rechercherJobs(jobs, filtres, tri, sauvegardes);
    const filtresActifs = compterFiltresActifs(filtres) > 0 || filtres.recherche.trim().length > 0;
    const focusName = (document.activeElement as HTMLElement | null)?.getAttribute('name');

    if (tri === 'pertinence' && !filtres.recherche.trim()) tri = 'recent';
    if (!resultats.some((job) => job.id === offreSelectionnee)) {
      offreSelectionnee = resultats[0]?.id ?? null;
      detailMobileOuvert = false;
      persisterUrl('replaceState');
    }
    const offreSelectionneeJob = jobs.find((job) => job.id === offreSelectionnee) ?? null;

    compteur.textContent = `${formaterCompteur(resultats.length, filtres.recherche)}${
      filtresActifs && !filtres.recherche.trim() ? ' · filtres actifs' : ''
    }`;
    zoneFiltres.innerHTML = barreRecherche(jobs, filtres, tri, sauvegardes);
    zoneChips.innerHTML = chipsFiltres(filtres);
    zoneListe.innerHTML = listeJobs(resultats, sauvegardes, {
      nombreAffichees,
      total: resultats.length,
      criteresActifs: filtresActifs,
      premierRendu,
      optionsCarte: (job) => ({
        href: urlEtat(filtres, tri, job.id),
        selectionnee: job.id === offreSelectionnee,
        consultee: offreConsultee(job.id),
      }),
    });
    premierRendu = false;
    zoneDetail.innerHTML = offreSelectionneeJob
      ? panneauDetailOffre(offreSelectionneeJob, estSauvegardee(offreSelectionneeJob.id))
      : '';
    page.classList.toggle('page-offres--detail-mobile', detailMobileOuvert);

    if (focusName) {
      const controle = zoneFiltres.querySelector<HTMLElement>(`[name="${focusName}"]`);
      controle?.focus();
    }
  }

  function selectionnerOffre(id: string, ouvrirMobile = true, empiler = true): void {
    if (!jobs.some((job) => job.id === id)) return;
    scrollListe = window.scrollY;
    offreSelectionnee = id;
    detailMobileOuvert = ouvrirMobile && window.matchMedia('(max-width: 1023px)').matches;
    marquerOffreConsultee(id);
    persisterUrl(empiler ? 'pushState' : 'replaceState');
    rendre();
  }

  function fermerDetail(): void {
    detailMobileOuvert = false;
    persisterUrl('replaceState', null);
    rendre();
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollListe });
      zoneListe
        .querySelector<HTMLAnchorElement>(`[data-id="${CSS.escape(offreSelectionnee ?? '')}"]`)
        ?.focus();
    });
  }

  function appliquerEtatUrl(): void {
    const etat = lireEtatUrl(new URLSearchParams(window.location.search));
    filtres = { ...FILTRES_VIDES, ...etat.filtres };
    tri = etat.tri;
    offreSelectionnee = etat.offre ?? jobs[0]?.id ?? null;
    detailMobileOuvert = Boolean(etat.offre);
    if (etat.offre && jobs.some((job) => job.id === etat.offre)) {
      marquerOffreConsultee(etat.offre);
    }
    nombreAffichees = OFFRES_PAR_CHARGEMENT;
    champRecherche.value = filtres.recherche;
    rendre();
  }

  champRecherche.addEventListener('input', () => {
    window.clearTimeout(minuteurRecherche);
    minuteurRecherche = window.setTimeout(() => {
      filtres.recherche = champRecherche.value;
      if (!filtres.recherche.trim()) tri = 'recent';
      nombreAffichees = OFFRES_PAR_CHARGEMENT;
      persisterUrl('pushState');
      rendre();
    }, DELAI_RECHERCHE_MS);
  });

  page.addEventListener('change', (evenement) => {
    const cible = evenement.target;
    if (!(cible instanceof HTMLSelectElement || cible instanceof HTMLInputElement)) return;
    window.clearTimeout(minuteurRecherche);
    filtres.recherche = champRecherche.value;
    if (!filtres.recherche.trim()) tri = 'recent';
    if (cible.name === 'contractType')
      filtres.contractType = cible.value as Filtres['contractType'];
    if (cible.name === 'source') filtres.source = cible.value as Filtres['source'];
    if (cible.name === 'publiee') filtres.publiee = cible.value as Filtres['publiee'];
    if (cible.name === 'tri') tri = cible.value as CritereTri;
    if (cible.name === 'sauvegardees' && cible instanceof HTMLInputElement) {
      filtres.sauvegardees = cible.checked;
    }
    nombreAffichees = OFFRES_PAR_CHARGEMENT;
    persisterUrl('pushState');
    rendre();
  });

  page.addEventListener('click', (evenement) => {
    const cible = evenement.target;
    if (!(cible instanceof Element)) return;
    const declencheur = cible.closest<HTMLElement>('[data-action]');
    if (!declencheur) return;

    switch (declencheur.dataset['action']) {
      case 'selectionner-offre': {
        evenement.preventDefault();
        const id = declencheur.dataset['id'];
        if (id) selectionnerOffre(id);
        return;
      }
      case ACTION_SAUVEGARDE: {
        const id = declencheur.dataset['id'];
        if (id) void basculerSauvegarde(id).then(rendre);
        return;
      }
      case ACTION_RETIRER: {
        const champ = declencheur.dataset['champ'];
        if (champ === 'recherche') {
          filtres.recherche = '';
          champRecherche.value = '';
        } else if (champ === 'sauvegardees') {
          filtres.sauvegardees = false;
        } else if (champ === 'contractType') {
          filtres.contractType = TOUS;
        } else if (champ === 'source') {
          filtres.source = TOUS;
        } else if (champ === 'publiee') {
          filtres.publiee = TOUS;
        }
        nombreAffichees = OFFRES_PAR_CHARGEMENT;
        persisterUrl('pushState');
        rendre();
        return;
      }
      case 'tout-effacer':
      case 'reinitialiser':
        filtres = { ...FILTRES_VIDES };
        tri = 'recent';
        champRecherche.value = '';
        nombreAffichees = OFFRES_PAR_CHARGEMENT;
        persisterUrl('pushState');
        rendre();
        return;
      case 'voir-plus':
        nombreAffichees += OFFRES_PAR_CHARGEMENT;
        rendre();
        return;
      case 'fermer-detail':
        fermerDetail();
        return;
      case 'copier-lien': {
        const lien = declencheur.dataset['lien'];
        if (lien) {
          if (!navigator.clipboard) {
            etatCopie.textContent = 'Copie impossible dans ce navigateur';
            return;
          }
          void navigator.clipboard
            .writeText(lien)
            .then(() => (etatCopie.textContent = 'Lien copié'))
            .catch(() => (etatCopie.textContent = 'Copie impossible dans ce navigateur'));
        }
        return;
      }
      case 'relancer':
        void charger();
        return;
    }
  });

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key === 'Escape' && detailMobileOuvert) {
      fermerDetail();
      return;
    }
    if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return;
    if (!(evenement.target instanceof Element) || !zoneListe.contains(evenement.target)) return;
    const cartes = [
      ...zoneListe.querySelectorAll<HTMLAnchorElement>('[data-action="selectionner-offre"]'),
    ];
    const index = cartes.indexOf(document.activeElement as HTMLAnchorElement);
    if (index < 0) return;
    evenement.preventDefault();
    cartes[
      Math.max(0, Math.min(cartes.length - 1, index + (evenement.key === 'ArrowDown' ? 1 : -1)))
    ]?.focus();
  });

  window.addEventListener('popstate', appliquerEtatUrl);

  async function charger(): Promise<void> {
    zoneListe.innerHTML = etatChargement(6);
    try {
      jobs = await listerJobs();
      if (!jobs.some((job) => job.id === offreSelectionnee)) {
        offreSelectionnee = jobs[0]?.id ?? null;
        detailMobileOuvert = false;
      } else if (depuisUrl.offre) {
        marquerOffreConsultee(depuisUrl.offre);
      }
      rendre();
      persisterUrl('replaceState');
    } catch (erreur) {
      const message =
        erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.';
      zoneListe.innerHTML = etatErreur(message);
      compteur.textContent = accorderOffres(0);
    }
  }

  await charger();
}
