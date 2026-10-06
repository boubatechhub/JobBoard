import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

const { FILTRES_VIDES } = await import('../src/types/job.ts');
const { lireEtatUrl, ecrireEtatUrl } = await import('../src/lib/etat-recherche.ts');
const { rechercherJobs } = await import('../src/lib/recherche.ts');
const { formaterAnciennete, formaterCompteur } = await import('../src/lib/format.ts');

const maintenant = new Date(2026, 9, 6, 12);

function job(overrides) {
  return {
    id: 'offre',
    reference: null,
    title: 'Chargée de mission',
    company: 'France Travail',
    contractType: 'Apprentissage',
    publishedAt: '2026-10-06',
    description: 'Coordonner les missions à Paris.',
    profile: 'Autonomie et organisation.',
    sourceUrl: null,
    source: 'airfrance',
    ...overrides,
  };
}

test('combine texte accentué, contrat, source et date', () => {
  const jobs = [
    job({ id: 'air-fr', source: 'france-travail' }),
    job({ id: 'air-ancien', publishedAt: '2026-10-03' }),
    job({ id: 'air-contrat', contractType: 'Professionnalisation' }),
    job({ id: 'air-ok' }),
  ];
  const filtres = {
    ...FILTRES_VIDES,
    recherche: 'chargee paris',
    contractType: 'Apprentissage',
    source: 'airfrance',
    publiee: '1',
  };

  assert.deepEqual(
    rechercherJobs(jobs, filtres, 'recent', new Set(), maintenant).map(({ id }) => id),
    ['air-ok'],
  );
});

test('trie les offres par récence ou pertinence', () => {
  const jobs = [
    job({
      id: 'recent',
      title: 'Assistant',
      description: 'Une expérience de développeur est bienvenue.',
      publishedAt: '2026-10-06',
    }),
    job({ id: 'pertinent', title: 'Développeur confirmé', publishedAt: '2026-10-01' }),
  ];
  const filtres = { ...FILTRES_VIDES, recherche: 'developpeur' };

  assert.equal(rechercherJobs(jobs, filtres, 'recent', new Set(), maintenant)[0]?.id, 'recent');
  assert.equal(
    rechercherJobs(jobs, filtres, 'pertinence', new Set(), maintenant)[0]?.id,
    'pertinent',
  );
});

test('formate les dates relatives en français', () => {
  assert.equal(formaterAnciennete('2026-10-06', maintenant), "Aujourd'hui");
  assert.equal(formaterAnciennete('2026-10-03', maintenant), 'Il y a 3 jours');
});

test('accorde le compteur et ajoute le contexte de recherche', () => {
  assert.equal(formaterCompteur(1, ''), '1 offre');
  assert.equal(formaterCompteur(128, 'chargé de mission'), '128 offres pour « chargé de mission »');
});

test('restaure et sérialise les filtres et l’offre depuis l’URL', () => {
  const etat = lireEtatUrl(
    new URLSearchParams(
      'q=charg%C3%A9&contrat=CDI&source=airfrance&date=7&tri=pertinence&offre=abc',
    ),
  );

  assert.deepEqual(etat, {
    filtres: {
      recherche: 'chargé',
      contractType: 'CDI',
      source: 'airfrance',
      publiee: '7',
      sauvegardees: false,
    },
    tri: 'pertinence',
    offre: 'abc',
  });
  assert.equal(
    ecrireEtatUrl(etat).toString(),
    'q=charg%C3%A9&contrat=CDI&source=airfrance&date=7&tri=pertinence&offre=abc',
  );
});

test('limite le filtre 24 h aux annonces publiées aujourd’hui', () => {
  const jobs = [
    job({ id: 'today', publishedAt: '2026-10-06' }),
    job({ id: 'yesterday', publishedAt: '2026-10-05' }),
  ];
  const filtres = { ...FILTRES_VIDES, publiee: '1' };

  assert.deepEqual(
    rechercherJobs(jobs, filtres, 'recent', new Set(), maintenant).map(({ id }) => id),
    ['today'],
  );
});
