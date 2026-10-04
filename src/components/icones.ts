/**
 * Icones dessinees a la main, toutes sur une grille de 24, meme graisse de
 * trait (1.6) et memes terminaisons. Aucun emoji dans l'interface : ils
 * tombent en carre vide selon la plateforme et ignorent la couleur du texte.
 */

const TRACES = {
  lieu: '<path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/>',
  calendrier:
    '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  diplome:
    '<path d="m12 4 9.5 5-9.5 5-9.5-5 9.5-5Z"/><path d="M6.5 11.5V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.5"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  contrat:
    '<path d="M6 3.5h8l4.5 4.5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"/><path d="M13.5 3.5V8H18M8.5 13h7M8.5 16.5h4.5"/>',
  batiment:
    '<path d="M3.5 20.5h17M5.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 14.5 5v15.5M14.5 10h3A1.5 1.5 0 0 1 19 11.5v9"/><path d="M8.5 7.5h3M8.5 11h3M8.5 14.5h3"/>',
  loupe: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  signet: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  etoile: '<path d="m12 3.5 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9z"/>',
  fleche: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  flecheDroite: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  croix: '<path d="M18 6 6 18M6 6l12 12"/>',
  reglages:
    '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  externe:
    '<path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5"/>',
  reference: '<path d="m11 3-2.5 18M17 3l-2.5 18M4 8.5h16M3.5 15.5h16"/>',
  soleil:
    '<circle cx="12" cy="12" r="4.3"/><path d="M12 3.3v2.1M12 18.6v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M3.3 12h2.1M18.6 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5"/>',
  lune: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/>',
  bulle: '<rect x="3.5" y="4.5" width="17" height="11" rx="2.5"/><path d="M8 15.5v3l4-3"/>',
  envoyer: '<path d="M12 19V5M6 11l6-6 6 6"/>',
} as const;

export type NomIcone = keyof typeof TRACES;

/** @param rempli remplit le trace (signet actif, etoile active). */
export function icone(nom: NomIcone, rempli = false): string {
  return `<svg viewBox="0 0 24 24" fill="${
    rempli ? 'currentColor' : 'none'
  }" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    TRACES[nom]
  }</svg>`;
}

/**
 * Signe de la marque : deux blocs qui alternent, plein puis ouvert.
 * Geometrie pure, pas une illustration.
 */
export function signeMarque(): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="7" height="16" rx="2" fill="currentColor" />
      <rect x="14" y="8.9" width="7" height="11.1" rx="2" stroke="currentColor" stroke-width="1.8" />
    </svg>
  `;
}
