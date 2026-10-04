import type { Job } from '../types/job';
import { escapeHtml, requireElement } from '../lib/dom';
import { LIEN_RECHERCHE } from '../lib/routeur';
import { formaterAnciennete, formaterDate, libelleSource } from '../lib/format';
import { trouverJob } from '../services/jobs';
import {
  basculerInteret,
  basculerSauvegarde,
  definirNote,
  estSauvegardee,
  obtenirSauvegarde,
} from '../services/sauvegardes';
import { enteteSimple } from '../components/entete';
import { badge, fait, faitCle, logoEntreprise } from '../components/elements';
import { icone } from '../components/icones';
import { ACTION_SAUVEGARDE, boutonSignet } from '../components/bouton-signet';
import { etatChargement, etatErreur } from '../components/etats';

const ACTION_INTERET = 'basculer-interet';
const DELAI_ENREGISTREMENT_MS = 500;

/** Une seule barre de candidature observee a la fois. */
let observateur: IntersectionObserver | null = null;

/**
 * `#app` survit d'une fiche a l'autre : sans ce controleur, les ecouteurs poses
 * sur la racine s'empileraient et un clic sur « Sauvegarder » basculerait
 * l'etat autant de fois qu'il y a eu de fiches consultees.
 */
let ecouteurs: AbortController | null = null;

function section(titre: string, contenu: string): string {
  if (!contenu) return '';
  return `
    <section class="section">
      <h2 class="section__titre">${escapeHtml(titre)}</h2>
      ${contenu}
    </section>
  `;
}

/** Le flux separe les paragraphes par des sauts de ligne simples. */
function texteMultiligne(texte: string): string {
  return `<p class="texte">${escapeHtml(texte).replace(/\n/g, '<br />')}</p>`;
}

function lienPostuler(job: Job, classe: string): string {
  if (!job.sourceUrl) return '';
  return `
    <a class="${classe}" href="${escapeHtml(job.sourceUrl)}" target="_blank" rel="noopener noreferrer">
      Postuler ${icone('externe')}
    </a>
  `;
}

/** Encart de candidature : l'action principale, puis les conditions connues. */
function encartCandidature(job: Job): string {
  return `
    <div class="encart">
      ${
        job.sourceUrl
          ? lienPostuler(job, 'bouton bouton--primaire bouton--grand')
          : '<p class="encart__note">Aucun lien de candidature fourni par cette annonce.</p>'
      }
      ${
        job.sourceUrl
          ? `<p class="encart__note">L'annonce s'ouvre sur le site de ${escapeHtml(job.company)}.</p>`
          : ''
      }

      <dl class="faits-cles">
        ${job.contractType ? faitCle('Contrat', job.contractType) : ''}
        ${job.publishedAt ? faitCle('Publication', formaterDate(job.publishedAt)) : ''}
        ${job.reference ? faitCle('Référence', job.reference) : ''}
        ${faitCle('Source', libelleSource(job.source))}
      </dl>
    </div>
  `;
}

/** Boutons de suivi, re-rendus seuls pour ne pas perturber la saisie de note. */
function actionsSuivi(job: Job): string {
  const interesse = obtenirSauvegarde(job.id)?.interested ?? false;

  return `
    ${boutonSignet(job, estSauvegardee(job.id), true)}
    <button
      type="button"
      class="bouton bouton--secondaire bouton--grand${interesse ? ' est-actif' : ''}"
      data-action="${ACTION_INTERET}"
      data-id="${escapeHtml(job.id)}"
      aria-pressed="${interesse}"
    >
      ${icone('etoile', interesse)}
      ${interesse ? 'Offre intéressante' : 'Marquer comme intéressante'}
    </button>
  `;
}

function encartSuivi(job: Job): string {
  const note = obtenirSauvegarde(job.id)?.note ?? '';

  return `
    <div class="encart">
      <h2 class="encart__titre">Mon suivi</h2>
      <div class="encart__actions" id="zone-actions">${actionsSuivi(job)}</div>

      <div class="champ">
        <label class="champ__libelle" for="note">Note personnelle</label>
        <textarea
          class="controle zone"
          id="note"
          rows="4"
          placeholder="Contact rencontré au forum, relance à prévoir"
        >${escapeHtml(note)}</textarea>
        <p class="aide" id="etat-note" aria-live="polite"></p>
      </div>

      <p class="encart__note">Ces informations restent sur cet appareil.</p>
    </div>
  `;
}

function gabarit(job: Job): string {
  return `
    ${enteteSimple()}

    <div class="barre-postuler" id="barre-postuler" data-visible="false">
      <div class="barre-postuler__contenu">
        <p class="barre-postuler__titre">
          ${escapeHtml(job.title)}
          <span class="barre-postuler__entreprise">${escapeHtml(job.company)}</span>
        </p>
        ${lienPostuler(job, 'bouton bouton--primaire')}
      </div>
    </div>

    <main class="fiche">
      <a class="retour" href="${LIEN_RECHERCHE}">${icone('fleche')} Retour aux offres</a>

      <article>
        <header class="fiche__tete" id="fiche-tete">
          ${logoEntreprise(job.company)}

          <div>
            <p class="fiche__entreprise">${escapeHtml(job.company)}</p>
            <h1 class="fiche__titre">${escapeHtml(job.title)}</h1>

            <ul class="fiche__faits">
              ${job.reference ? fait('reference', job.reference) : ''}
              ${
                job.publishedAt
                  ? fait('horloge', `Publiée ${formaterAnciennete(job.publishedAt)}`)
                  : ''
              }
            </ul>

            ${
              job.contractType
                ? `<p class="fiche__alerte">${badge(job.contractType, 'accent')}</p>`
                : ''
            }
          </div>
        </header>

        <div class="fiche__corps">
          <div class="fiche__contenu">
            ${section(
              'Description du poste',
              job.description ? texteMultiligne(job.description) : '',
            )}
            ${section('Profil recherché', job.profile ? texteMultiligne(job.profile) : '')}
          </div>

          <aside class="fiche__rail">
            ${encartCandidature(job)}
            ${encartSuivi(job)}
          </aside>
        </div>
      </article>
    </main>
  `;
}

/**
 * Barre de candidature : elle n'existe que sous 1000 px, la ou le rail n'est
 * plus colle. Au-dessus, l'action reste visible dans le rail.
 */
function surveillerBarre(racine: HTMLElement): void {
  observateur?.disconnect();

  const barre = requireElement<HTMLElement>('#barre-postuler', racine);
  const tete = requireElement<HTMLElement>('#fiche-tete', racine);

  observateur = new IntersectionObserver(
    ([entree]) => {
      if (!entree) return;
      const depassee = !entree.isIntersecting && entree.boundingClientRect.top < 0;
      barre.dataset['visible'] = String(depassee);
    },
    { threshold: 0 },
  );

  observateur.observe(tete);
}

/**
 * Monte la fiche d'une offre.
 *
 * `trouverJob` va au reseau a chaque appel (le service ne garde pas de cache) :
 * cliquer sur une offre affiche toujours son etat courant dans le flux, jamais
 * une copie perimee.
 */
export async function monterPageDetail(racine: HTMLElement, id: string): Promise<void> {
  observateur?.disconnect();
  ecouteurs?.abort();
  ecouteurs = new AbortController();
  const { signal } = ecouteurs;

  racine.innerHTML = `${enteteSimple()}<main class="fiche">${etatChargement(3)}</main>`;

  let job: Job | null;
  try {
    job = await trouverJob(id);
  } catch (erreur) {
    const message =
      erreur instanceof Error ? erreur.message : 'Une erreur inattendue est survenue.';
    racine.innerHTML = `${enteteSimple()}<main class="fiche">${etatErreur(message)}</main>`;
    return;
  }

  if (!job) {
    racine.innerHTML = `
      ${enteteSimple()}
      <main class="fiche">
        <a class="retour" href="${LIEN_RECHERCHE}">${icone('fleche')} Retour aux offres</a>
        <div class="registre">
          <div class="etat" role="status">
            <p class="etat__titre">Cette offre n'existe plus</p>
            <p class="etat__texte">
              Elle a été retirée du flux, ou le lien est incorrect. Les offres en ligne
              restent accessibles depuis la recherche.
            </p>
          </div>
        </div>
      </main>
    `;
    return;
  }

  const offre = job;
  racine.innerHTML = gabarit(offre);
  window.scrollTo({ top: 0 });
  surveillerBarre(racine);

  const zoneActions = requireElement<HTMLElement>('#zone-actions', racine);
  const note = requireElement<HTMLTextAreaElement>('#note', racine);
  const etatNote = requireElement<HTMLElement>('#etat-note', racine);

  racine.addEventListener(
    'click',
    (evenement) => {
      const cible = evenement.target;
      if (!(cible instanceof Element)) return;

      const declencheur = cible.closest<HTMLElement>('[data-action]');
      if (!declencheur) return;

      const action = declencheur.dataset['action'];
      const rafraichir = (): void => {
        zoneActions.innerHTML = actionsSuivi(offre);
      };

      if (action === ACTION_SAUVEGARDE) {
        declencheur.classList.add('est-anime');
        declencheur.addEventListener(
          'animationend',
          () => declencheur.classList.remove('est-anime'),
          { once: true },
        );
        void basculerSauvegarde(offre.id).then(rafraichir);
      } else if (action === ACTION_INTERET) {
        void basculerInteret(offre.id).then(rafraichir);
      }
    },
    { signal },
  );

  // Enregistrement differe : evite une ecriture a chaque frappe.
  let minuteur: number | undefined;
  note.addEventListener('input', () => {
    window.clearTimeout(minuteur);
    etatNote.textContent = 'Enregistrement';

    minuteur = window.setTimeout(() => {
      void definirNote(offre.id, note.value).then(() => {
        etatNote.textContent = 'Note enregistrée';
        zoneActions.innerHTML = actionsSuivi(offre);
      });
    }, DELAI_ENREGISTREMENT_MS);
  });
}
