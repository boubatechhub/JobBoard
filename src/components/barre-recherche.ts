import { TOUS } from '../types/job';
import type { CritereTri, Filtres, Job } from '../types/job';
import { escapeHtml } from '../lib/dom';
import { cleSource, libelleSource } from '../lib/format';
import { compterParContrat, compterParSource, contratsDisponibles } from '../lib/recherche';
import { icone } from './icones';

function options(
  valeurs: { valeur: string; libelle: string; nombre: number }[],
  selection: string,
  toutes: string,
): string {
  return `
    <option value="${TOUS}" ${selection === TOUS ? 'selected' : ''}>${toutes}</option>
    ${valeurs
      .map(
        (option) =>
          `<option value="${escapeHtml(option.valeur)}" ${selection === option.valeur ? 'selected' : ''} ${option.nombre === 0 ? 'disabled' : ''}>${escapeHtml(option.libelle)} (${option.nombre})</option>`,
      )
      .join('')}
  `;
}

export function barreRecherche(
  jobs: Job[],
  filtres: Filtres,
  tri: CritereTri,
  sauvegardes: Set<string>,
): string {
  const contrats = contratsDisponibles(jobs);
  const comptesContrat = compterParContrat(jobs, filtres, sauvegardes);
  const contratsOptions = contrats.map((valeur) => ({
    valeur,
    libelle: valeur,
    nombre: comptesContrat.get(valeur) ?? 0,
  }));
  const sources = [...new Set(jobs.map((job) => cleSource(job.source)))].sort();
  const comptesSource = compterParSource(jobs, filtres, sauvegardes);
  const sourcesOptions = sources.map((valeur) => ({
    valeur,
    libelle: libelleSource(valeur),
    nombre: comptesSource.get(valeur) ?? 0,
  }));

  return `
    <div class="barre-recherche__filtres">
      <label class="filtre-select">
        <span class="sr-only">Contrat</span>
        <select class="controle" name="contractType" aria-label="Contrat">
          ${options(contratsOptions, filtres.contractType, 'Contrat')}
        </select>
      </label>
      <label class="filtre-select">
        <span class="sr-only">Source</span>
        <select class="controle" name="source" aria-label="Source">
          ${options(sourcesOptions, filtres.source, 'Source')}
        </select>
      </label>
      <label class="filtre-select">
        <span class="sr-only">Date de publication</span>
        <select class="controle" name="publiee" aria-label="Date de publication">
          <option value="tous" ${filtres.publiee === TOUS ? 'selected' : ''}>Toutes les dates</option>
          <option value="1" ${filtres.publiee === '1' ? 'selected' : ''}>24 h</option>
          <option value="7" ${filtres.publiee === '7' ? 'selected' : ''}>7 jours</option>
          <option value="30" ${filtres.publiee === '30' ? 'selected' : ''}>30 jours</option>
        </select>
      </label>
      <label class="tri">
        <span class="sr-only">Trier les offres</span>
        <select class="controle" name="tri" aria-label="Trier les offres">
          <option value="recent" ${tri === 'recent' ? 'selected' : ''}>Plus récentes</option>
          ${filtres.recherche.trim() ? `<option value="pertinence" ${tri === 'pertinence' ? 'selected' : ''}>Pertinence</option>` : ''}
        </select>
      </label>
      <label class="bascule bascule--compacte">
        <input type="checkbox" name="sauvegardees" class="sr-only" ${filtres.sauvegardees ? 'checked' : ''} />
        <span class="bascule__corps">${icone('signet')}<span>Sauvegardées</span></span>
      </label>
    </div>
  `;
}
