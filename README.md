# Alternance.io

Interface de recherche et de suivi d'offres d'alternance : job board, recherche pondérée,
filtres, tri, page détail et sauvegarde d'offres. HTML / CSS / TypeScript, sans framework
UI, servi par Vite.

Les offres sont fictives pour cette première phase ; l'architecture est prête à recevoir
des offres réelles sans réécriture (voir [CLAUDE.md](CLAUDE.md)).

## Démarrage

```bash
npm install
npm run dev
```

L'application est disponible sur http://localhost:5173.

## Scripts

| Commande            | Rôle                                               |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Serveur de développement avec rechargement à chaud |
| `npm run build`     | Vérification des types puis build dans `dist/`     |
| `npm run preview`   | Sert le build de production                        |
| `npm run typecheck` | Vérification TypeScript seule                      |
| `npm run format`    | Formatage Prettier                                 |

## Fonctionnalités

- **38 offres** réalistes : 20 entreprises, 12 villes, 6 familles de métiers
- **Recherche** plein texte pondérée, insensible à la casse et aux accents, conjonctive
  (`développeur react paris` exige les trois termes)
- **10 filtres** : métier, localisation, mode de travail, contrat, niveau d'études,
  rythme, technologie, secteur, date de publication, salaire minimum
- **4 tris** : pertinence, plus récentes, plus anciennes, date limite de candidature
- **Page détail** par offre (`#/offre/:id`) : missions, profil, compétences,
  technologies, avantages, conditions, entreprise, lien vers l'annonce d'origine
- **Suivi personnel** : sauvegarde, marquage « intéressante », note — conservés sur
  l'appareil
- États de chargement, vide et erreur ; responsive desktop / tablette / mobile ; thème
  clair et sombre automatiques

## Structure

```text
src/
├── types/job.ts       modèle de données standardisé
├── data/jobs.ts       offres fictives
├── services/          frontière avec la source des données (déjà asynchrone)
├── lib/               recherche, formatage, facettes, routage — sans DOM
├── components/        cartes, filtres, badges, états
├── pages/             recherche et détail
└── styles/            tokens, base, layout, composants
```

Voir [CLAUDE.md](CLAUDE.md) pour l'architecture détaillée, les conventions et la roadmap.

## Remplacer les données fictives

Un seul fichier change : [src/services/jobs.ts](src/services/jobs.ts). Ses fonctions sont
déjà asynchrones et faillibles, et l'interface gère déjà les états de chargement et
d'erreur — aucun composant n'est à modifier.
