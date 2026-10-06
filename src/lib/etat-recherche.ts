import { FILTRES_VIDES, TOUS } from '../types/job';
import type { CritereTri, Filtres } from '../types/job';

export interface EtatRechercheUrl {
  filtres: Pick<Filtres, 'recherche' | 'contractType' | 'source' | 'publiee' | 'sauvegardees'>;
  tri: CritereTri;
  offre: string | null;
}

function lireFenetre(valeur: string | null): Filtres['publiee'] {
  return valeur === '1' || valeur === '7' || valeur === '30' ? valeur : TOUS;
}

export function lireEtatUrl(parametres: URLSearchParams): EtatRechercheUrl {
  return {
    filtres: {
      recherche: parametres.get('q') ?? FILTRES_VIDES.recherche,
      contractType: parametres.get('contrat') ?? TOUS,
      source: parametres.get('source') ?? TOUS,
      publiee: lireFenetre(parametres.get('date')),
      sauvegardees: parametres.get('sauvegardees') === '1',
    },
    tri: parametres.get('tri') === 'pertinence' ? 'pertinence' : 'recent',
    offre: parametres.get('offre'),
  };
}

export function ecrireEtatUrl(etat: EtatRechercheUrl): URLSearchParams {
  const parametres = new URLSearchParams();
  const { filtres } = etat;
  if (filtres.recherche.trim()) parametres.set('q', filtres.recherche.trim());
  if (filtres.contractType !== TOUS) parametres.set('contrat', filtres.contractType);
  if (filtres.source !== TOUS) parametres.set('source', filtres.source);
  if (filtres.publiee !== TOUS) parametres.set('date', filtres.publiee);
  if (filtres.sauvegardees) parametres.set('sauvegardees', '1');
  if (etat.tri !== 'recent') parametres.set('tri', etat.tri);
  if (etat.offre) parametres.set('offre', etat.offre);
  return parametres;
}
