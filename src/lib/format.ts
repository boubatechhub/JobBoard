const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const JOUR_MS = 86_400_000;

/** Parse une date ISO en heure locale pour eviter le decalage de fuseau. */
function enDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** "15 septembre 2026" */
export function formaterDate(iso: string): string {
  return FORMAT_DATE.format(enDate(iso));
}

/** "il y a 3 jours" */
export function formaterAnciennete(iso: string, maintenant: Date = new Date()): string {
  const jours = Math.floor((maintenant.getTime() - enDate(iso).getTime()) / JOUR_MS);

  if (jours <= 0) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours < 7) return `Il y a ${jours} jours`;
  if (jours < 14) return 'Il y a 1 semaine';
  if (jours < 31) return `Il y a ${Math.floor(jours / 7)} semaines`;
  if (jours < 61) return 'Il y a 1 mois';
  return `Il y a ${Math.floor(jours / 30)} mois`;
}

export function estNouveau(iso: string, maintenant: Date = new Date()): boolean {
  const jours = Math.floor((maintenant.getTime() - enDate(iso).getTime()) / JOUR_MS);
  return jours >= 0 && jours < 3;
}

/** "12 offres" / "1 offre" / "Aucune offre" */
export function accorderOffres(nombre: number): string {
  if (nombre === 0) return 'Aucune offre';
  if (nombre === 1) return '1 offre';
  return `${new Intl.NumberFormat('fr-FR').format(nombre)} offres`;
}

export function formaterCompteur(nombre: number, recherche: string): string {
  const total = accorderOffres(nombre);
  const requete = recherche.trim();
  return requete ? `${total} pour « ${requete} »` : total;
}

/**
 * Nom lisible d'une source d'offres. La cle brute reste dans les donnees ;
 * seul l'affichage est traduit.
 */
const LIBELLES_SOURCE: Record<string, string> = {
  'france-travail': 'France Travail',
  francetravail: 'France Travail',
  airfrance: 'Air France',
};

export function libelleSource(source: string): string {
  return LIBELLES_SOURCE[source] ?? source;
}

export function cleSource(source: string): string {
  const normalisee = source.toLowerCase().replace(/[^a-z]/g, '');
  if (normalisee === 'airfrance') return 'airfrance';
  if (normalisee === 'francetravail') return 'francetravail';
  return source;
}

/** Initiales d'une entreprise, utilisees a defaut de logo. */
export function initiales(nom: string): string {
  return nom
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Teinte stable derivee du nom de l'entreprise : donne a chaque logo textuel
 * une couleur reconnaissable sans stocker de couleur dans les donnees.
 */
export function teinteEntreprise(nom: string): number {
  let empreinte = 0;
  for (let index = 0; index < nom.length; index += 1) {
    empreinte = (empreinte * 31 + nom.charCodeAt(index)) % 360;
  }
  return empreinte;
}
