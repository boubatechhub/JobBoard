const CLE_STOCKAGE = 'alternance.offres-consultees.v1';

let consultees = new Set<string>();
let chargees = false;

function persister(): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify([...consultees]));
  } catch {
    // L'etat memoire reste utilisable si le stockage est indisponible.
  }
}

export function chargerOffresConsultees(): void {
  if (chargees) return;
  chargees = true;
  try {
    const valeur: unknown = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE) ?? '[]');
    if (Array.isArray(valeur))
      consultees = new Set(valeur.filter((id): id is string => typeof id === 'string'));
  } catch {
    consultees = new Set();
  }
}

export function offreConsultee(id: string): boolean {
  return consultees.has(id);
}

export function marquerOffreConsultee(id: string): void {
  consultees.add(id);
  persister();
}
