import { escapeHtml } from './dom';

/**
 * Rendu markdown volontairement limite : gras et listes a puces, rien
 * d'autre. Pas de liens, pas de code, pas de titres.
 *
 * Le texte est echappe avant toute transformation. Les marqueurs markdown
 * ("**", "-", "*") survivent a l'echappement HTML (ce ne sont pas des
 * caracteres HTML), donc aucune balise venue de la reponse ne peut se glisser
 * dans le HTML produit : ce que la fonction retourne est toujours sur de la
 * meme facon que `escapeHtml()` seul, juste mis en forme par-dessus.
 */
export function rendreMarkdownLeger(texte: string): string {
  const echappe = escapeHtml(texte).trim();
  if (!echappe) return '';

  const blocs: string[] = [];
  let puces: string[] = [];
  let paragraphe: string[] = [];

  const fermerListe = (): void => {
    if (puces.length === 0) return;
    blocs.push(`<ul>${puces.map((item) => `<li>${gras(item)}</li>`).join('')}</ul>`);
    puces = [];
  };

  const fermerParagraphe = (): void => {
    if (paragraphe.length === 0) return;
    blocs.push(`<p>${paragraphe.map(gras).join('<br />')}</p>`);
    paragraphe = [];
  };

  for (const ligneBrute of echappe.split('\n')) {
    const ligne = ligneBrute.trim();
    const puce = /^[-*]\s+(.+)/.exec(ligne);

    if (puce) {
      fermerParagraphe();
      puces.push(puce[1] ?? '');
    } else if (ligne) {
      fermerListe();
      paragraphe.push(ligne);
    } else {
      // Ligne vide : separateur de paragraphe.
      fermerListe();
      fermerParagraphe();
    }
  }
  fermerListe();
  fermerParagraphe();

  return blocs.join('');
}

/** "**mot**" -> "<strong>mot</strong>" ; seul marqueur inline reconnu. */
function gras(segment: string): string {
  return segment.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
