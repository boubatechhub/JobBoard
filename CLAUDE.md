# CLAUDE.md

Référence du projet pour Claude Code : produit, architecture, modèle de données, règles
de développement et roadmap. **À lire avant toute modification.**

---

## 1. Le produit

Application **SaaS de recherche d'offres d'alternance et de suivi de candidatures**.

L'utilisateur doit pouvoir découvrir des offres pertinentes, les consulter, les
sauvegarder, puis — dans les versions futures — suivre l'intégralité de son processus de
candidature. Le produit doit évoluer vers un véritable **assistant de recherche
d'alternance**.

La phase actuelle est une interface complète alimentée par des **données fictives
réalistes**, remplacées progressivement par des offres récupérées automatiquement.

## 2. Architecture fonctionnelle cible

```text
Sources d'offres
    ↓
API / Scraping / Automatisation
    ↓
Normalisation des données
    ↓
Détection des doublons
    ↓
Base de données
    ↓
Backend / API
    ↓
Moteur de recherche et de filtrage
    ↓
Interface utilisateur
    ↓
Sauvegarde / Candidature / Suivi
```

**Conséquence sur le code d'aujourd'hui** : l'interface doit pouvoir brancher les étapes
amont **sans réécriture majeure**. Deux invariants en découlent :

1. L'UI ne connaît qu'un **modèle d'offre unique** (`Job`), indépendant de la provenance.
2. L'UI ne lit **jamais** les données fictives directement : tout passe par
   `src/services/`, déjà asynchrone (§5).

## 3. Phase actuelle

**En place et fonctionnel** :

- job board complet : liste de cartes, mises en avant, compteur de résultats ;
- recherche plein texte pondérée, insensible à la casse et aux accents ;
- 10 filtres + pastilles de filtres actifs retirables une par une ;
- 4 tris : pertinence, plus récentes, plus anciennes, date limite ;
- page détail par offre (routage `#/offre/:id`) avec lien vers l'annonce d'origine ;
- sauvegarde d'offres, marquage « intéressante », note personnelle (localStorage) ;
- états de chargement (squelettes), vide et erreur ;
- responsive desktop / tablette / mobile, thème clair et sombre automatiques ;
- 38 offres fictives, 20 entreprises, 12 villes, 6 familles de métiers.

**À ne PAS implémenter maintenant** (phases ultérieures, sauf demande explicite) :
scraping réel, récupération automatique d'offres, crawling, intégration d'API externe,
recommandation IA, recherche sémantique, matching profil/offre, notifications,
automatisation quotidienne.

## 4. Stack et commandes

- **HTML** sémantique — un seul `index.html`, tout le contenu est injecté par le JS
- **CSS** natif, sans framework ni préprocesseur
- **TypeScript** en mode `strict`, **sans framework UI** (pas de React/Vue)
- **Vite** pour le serveur de dev et le build

Ne pas ajouter de dépendance (UI, utilitaires, CSS framework) sans demande explicite :
l'objectif est de rester sur les APIs natives du navigateur.

```bash
npm run dev        # serveur de dev sur http://localhost:5173
npm run build      # tsc --noEmit puis build de production dans dist/
npm run typecheck  # vérification des types seule
npm run preview    # sert le build de dist/
npm run format     # Prettier
```

**Avant de considérer une tâche terminée : `npm run build` doit passer.**

## 5. Architecture du code

```text
index.html                    coquille : lien d'évitement + #app
src/
  main.ts                     amorçage : chargement des sauvegardes, routeur, état global
  types/job.ts                modèle de données — source de vérité des types
  data/jobs.ts                38 offres fictives (jamais importé par un composant)
  services/
    jobs.ts                   listerJobs() / trouverJob() — frontière avec la source
    sauvegardes.ts            favoris, intérêt, notes (localStorage)
  lib/
    dom.ts                    escapeHtml(), requireElement()
    format.ts                 dates, salaires, durées, libellés FR, initiales, teinte
    recherche.ts              filtrage, scoring, tri (pur, sans DOM)
    facettes.ts               valeurs distinctes alimentant les filtres
    routeur.ts                routage par hash
  components/
    entete.ts                 marque, barre de recherche, bascule « sauvegardées »
    panneau-filtres.ts        balisage des 10 filtres + output du curseur salaire
    carte-job.ts              carte d'offre
    liste-jobs.ts             grille de résultats + bandeau mises en avant
    chips-filtres.ts          pastilles de filtres actifs
    bouton-signet.ts          bouton de sauvegarde (carte et détail)
    elements.ts               primitives : badge, tag, logo, meta, ligne de détail
    icones.ts                 jeu d'icônes SVG
    etats.ts                  chargement (squelettes), vide, erreur
  pages/
    page-recherche.ts         formulaire unique, cycle de rendu, délégation d'événements
    page-detail.ts            fiche complète + encart de suivi
  styles/
    index.css                 point d'entrée (ordre des imports significatif)
    tokens.css                variables : couleurs, espacements, rayons, ombres
    base.css                  reset, typographie, utilitaires
    layout.css                en-tête, colonnes, page détail, points de rupture
    composants.css            boutons, champs, cartes, badges, états, squelettes
```

### Couches et responsabilités

```text
UI (components/, pages/, styles/)
    ↓
Logique métier (lib/recherche.ts, lib/format.ts, lib/facettes.ts)  — pure, sans DOM
    ↓
Services (services/)  — seule frontière avec la provenance des données
    ↓
Données (data/jobs.ts aujourd'hui, API demain)
```

Correspondance avec le découpage `data / types / services / components / pages / hooks` :
tous existent, sauf `hooks/` qui est sans objet ici (pas de React). Son équivalent est
`lib/` pour la logique pure et le couple _gabarit HTML + délégation d'événements_ pour
l'état local.

### Le seam de données

`services/jobs.ts` est **asynchrone et faillible dès aujourd'hui**, alors qu'il ne lit
qu'un tableau en mémoire :

```ts
export async function listerJobs(): Promise<Job[]>;
export async function trouverJob(id: string): Promise<Job | null>;
```

Le jour où ces fonctions feront un `fetch`, **aucun composant ni aucune page ne change** :
les états chargement / vide / erreur sont déjà câblés, et une latence simulée
(`LATENCE_MS`) garde ces états honnêtes pendant le développement. Ne jamais importer
`data/jobs.ts` ailleurs que dans ce service.

`services/sauvegardes.ts` suit le même contrat : **lectures synchrones** sur un cache
mémoire chargé une fois au démarrage, **écritures asynchrones** qui persistent. C'est le
comportement d'un état client synchronisé avec un serveur ; le passage à une API se limite
à cette couche.

### Où poser un nouveau fichier

- Un affichage réutilisable → `components/`
- Une vue complète adressable par URL → `pages/`
- Un calcul, un tri, un filtre, un formatage → `lib/` (pur, testable, sans DOM)
- Un accès à la donnée ou à la persistance → `services/`
- Un type métier → `types/`

## 6. Modèle de données

### Principe

Une offre issue d'une API, d'un scraper, d'une automatisation ou des données fictives
utilise **le même type `Job`**. Aucun composant ne doit dépendre d'une source spécifique,
ni contenir de logique conditionnelle sur la provenance.

Le modèle est en **anglais** (`title`, `workMode`) pour coller au vocabulaire des sources
à venir ; le reste du code reste en français (§11).

### Le type `Job` (`src/types/job.ts`)

| Champ                                               | Notes                                                     |
| --------------------------------------------------- | --------------------------------------------------------- |
| `id`                                                | slug stable, sert de clé de déduplication et d'URL        |
| `title`, `company`, `industry`                      | —                                                         |
| `companyLogo?`                                      | URL ; à défaut l'UI affiche les initiales sur teinte      |
| `companyDescription?`, `companySize?`               | alimentent la section « L'entreprise »                    |
| `category`                                          | famille de métier, union littérale `JOB_CATEGORIES`       |
| `publishedAt`, `applicationDeadline?`, `startDate?` | ISO `YYYY-MM-DD`                                          |
| `location`                                          | objet `{ city, department, region, country }`             |
| `workMode`                                          | `'onsite' \| 'hybrid' \| 'remote'`                        |
| `contractType`                                      | `'apprenticeship' \| 'professionalization'`               |
| `workStudyRhythm`, `educationLevel`, `duration`     | durée en mois                                             |
| `salary?`                                           | `{ min, max, currency, period }`                          |
| `description`, `missions`, `profile?`               | —                                                         |
| `requiredSkills` / `technologies`                   | distincts : savoir-faire vs outils filtrables             |
| `benefits`                                          | —                                                         |
| `source`, `sourceUrl`                               | **obligatoires** — sans eux, pas de déduplication phase 3 |
| `featured?`                                         | mise en avant sur la page de recherche                    |

### Règles d'extension

- Toute nouvelle propriété **commence par `types/job.ts`**, puis se propage aux données,
  aux filtres et aux composants.
- Préférer les **unions littérales** aux `string` libres : les filtres deviennent
  exhaustifs et vérifiables par le compilateur.
- Un champ que l'UI affiche est **obligatoire ou possède un repli documenté** ; un champ
  qu'une source peut ne pas fournir est **optionnel** et géré au rendu. Le jeu de données
  contient volontairement des offres sans `salary`, sans `profile` ou sans
  `applicationDeadline` pour éprouver ces cas.
- `source` reste une clé technique ; son affichage passe par `libelleSource()`.

## 7. Données fictives

38 offres dans `src/data/jobs.ts`, structurées comme une réponse d'API : dates étalées sur
deux mois, salaires variés, trois modes de travail, deux types de contrat, quatre niveaux
d'études, six rythmes.

**Jamais de données d'offres dans un composant.** Un composant reçoit des offres en
paramètre, il ne les importe pas.

## 8. Recherche, filtres et tri

**Recherche** (`lib/recherche.ts`) — normalisation (minuscules, sans accent, sans
ponctuation) puis scoring pondéré : titre 12, technologies 7, entreprise et ville 6,
compétences 4, catégorie 3, secteur 2, description 1 ; un mot en début de champ vaut
1,5×. La recherche est **conjonctive** : `développeur react paris` exige les trois termes,
sinon l'offre est écartée. C'est ici que se grefferont la recherche sémantique et le
matching profil/offre, sans toucher aux composants.

**Filtres** — métier, localisation, mode de travail, type de contrat, niveau d'études,
rythme, technologie, secteur, date de publication, salaire minimum, plus la restriction
aux offres sauvegardées.

Ajouter un filtre reste une opération locale : **un champ dans `Filtres`
(`types/job.ts`), une condition dans `correspondAuxFiltres`, un contrôle dans
`panneau-filtres.ts`**, plus une ligne dans `chips-filtres.ts` et dans
`compterFiltresActifs`. Si l'ajout oblige à toucher une carte ou `main.ts`, c'est le signe
d'un couplage à corriger.

**Tri** — `pertinence` (score, puis fraîcheur), `recent`, `ancien`, `deadline` (offres
sans date limite en dernier).

## 9. Expérience utilisateur

Job board / moteur de recherche moderne. L'utilisateur doit pouvoir rapidement :
rechercher → filtrer → trier → comprendre → ouvrir le détail → accéder à l'annonce
d'origine → sauvegarder.

**La priorité est la rapidité de compréhension.** Une carte répond d'un coup d'œil à :
quel poste, quelle entreprise, où, quel rythme, quel niveau, quelle durée, quel contrat,
quel salaire, quelles technologies, publiée quand. Tout le reste appartient à la vue
détail.

## 10. Design et UI

Direction visuelle : moderne, professionnelle, minimaliste, intuitive, SaaS, orientée
productivité, responsive.

À éviter : interfaces génériques, composants inutilement complexes, surcharge visuelle,
informations secondaires trop visibles, espacements incohérents.

**Règles CSS du projet**

- Nommage type BEM en français : `.carte`, `.carte__titre`, `.bouton--primaire`.
- Aucune couleur, ombre ou espacement en dur dans les composants : tout vient de
  `tokens.css`. Une nouvelle couleur = un nouveau token.
- Le thème sombre se gère **uniquement** en redéfinissant les tokens sous
  `@media (prefers-color-scheme: dark)`. Une seule exception documentée : les logos à
  initiales, dont la teinte est calculée en HSL.
- Points de rupture : `1000px` (le panneau de filtres passe en volet dépliable) et
  `760px` (colonne unique, en-tête sur deux lignes).
- États `hover`, `focus-visible` et `active` explicites sur tout élément interactif.

**Accessibilité** : HTML sémantique (`article`, `dl`, `fieldset`, `header`), un `label`
par champ, `aria-pressed` sur les bascules, `aria-live` sur le compteur de résultats,
`aria-busy` pendant le chargement, focus visible conservé, lien d'évitement, contraste
tenu dans les deux thèmes.

**Icônes** : jamais d'emoji dans l'interface — ils tombent en carré vide selon la
plateforme et ignorent la couleur du texte. Tout passe par `components/icones.ts`.

## 11. Conventions de code

**Langue** — le code, les noms et les commentaires sont en **français**
(`carteJob`, `rechercherJobs`, `--couleur-primaire`), **sauf le modèle métier et ses
champs, en anglais** (§6). Fichiers en `kebab-case`, fonctions et variables en
`camelCase`, types en `PascalCase`, constantes en `SCREAMING_SNAKE_CASE`. Le code source
reste **sans accents** ; les accents ne vivent que dans les chaînes affichées.

**TypeScript** — pas de `any` ; `import type { … }` pour les types
(`verbatimModuleSyntax` actif). La logique métier reste **pure et sans DOM** dans `lib/` ;
seuls `pages/`, `components/` et `main.ts` touchent au DOM.

**Composants** — ce sont des fonctions, pas des classes. Un composant d'affichage retourne
une **chaîne HTML** ; une page prend un conteneur et monte son propre cycle de rendu.

**Sécurité** — le rendu utilise `innerHTML`. Toute valeur interpolée passe
**obligatoirement** par `escapeHtml()` de `lib/dom.ts`. Règle critique dès que les offres
viendront de sources externes.

**Événements** — délégation à la racine de la page, jamais de gestionnaire par carte. Un
élément interactif déclare `data-action` (+ `data-id` ou `data-champ`) et la page
l'aiguille. Actions existantes : `basculer-sauvegarde`, `basculer-interet`,
`retirer-filtre`, `reinitialiser`, `basculer-filtres`, `relancer`.

**Formulaire unique** — la page de recherche englobe l'en-tête, les filtres et le tri dans
**un seul `<form>`**. Un `FormData` suffit alors à lire tout l'état, il n'y a aucune
synchronisation entre contrôles, et `type="reset"` remet tout à zéro gratuitement. Le
formulaire est monté une fois ; **seuls les résultats sont re-rendus**, donc le champ de
recherche ne perd jamais le focus.

**État** — un objet `EtatRecherche` (filtres + tri) vit dans `main.ts` et survit à la
navigation vers le détail et retour. Chaque changement relit le formulaire et régénère la
liste. Pas de rendu incrémental tant que la volumétrie reste faible (~50 offres).

## 12. Principes de développement

1. **Ne pas sur-ingénieriser** — la solution la plus simple qui répond au besoin.
2. **Réutilisabilité** — créer un composant dès qu'un élément apparaît plusieurs fois.
3. **Séparation des responsabilités** — UI → logique métier → services → données (§5).
4. **Typage** — respecter le système en place, éviter les `any`.
5. **Données** — ne jamais coupler fortement l'UI aux données fictives.
6. **Évolution** — toute fonctionnalité se pense en tenant compte de la future
   récupération automatisée des offres.
7. **Maintenance** — code lisible, explicite, maintenable, testable, facilement
   modifiable.

## 13. Avant d'implémenter une fonctionnalité

1. Comprendre le fonctionnement actuel.
2. Identifier les fichiers concernés.
3. Vérifier si un composant / service / utilitaire existe déjà.
4. Réutiliser l'existant quand c'est pertinent.
5. Éviter les duplications.
6. Préserver les fonctionnalités existantes.
7. Ne modifier que ce qui est nécessaire.
8. Vérifier que la modification reste compatible avec l'évolution du produit (§2).

**Ne pas réécrire massivement le projet quand une modification ciblée suffit.**

## 14. Roadmap

| Phase | Thème                    | Contenu                                                                                     |
| ----- | ------------------------ | ------------------------------------------------------------------------------------------- |
| 1     | **Interface** _(livrée)_ | Job board, recherche, filtres, tri, détail d'offre, données fictives                        |
| 2     | Backend                  | Base de données, modèle `Job`, API, authentification, offres sauvegardées côté serveur      |
| 3     | Collecte automatique     | Sources d'offres, API / scraping, automatisation, normalisation, déduplication, mise à jour |
| 4     | Personnalisation         | Profil, compétences, localisation, préférences, matching, score de pertinence               |
| 5     | Suivi des candidatures   | Ajout d'une candidature, statuts, relances, notes, historique, tableau de suivi             |
| 6     | Intelligence             | Recommandations, veille automatique, analyse des offres, suggestions, alertes pertinentes   |

### Premiers pas concrets de la phase 2

1. Remplacer le corps de `services/jobs.ts` par un `fetch` — rien d'autre à toucher.
2. Déplacer `services/sauvegardes.ts` vers l'API en gardant lectures synchrones sur cache
   et écritures asynchrones.
3. Reprendre les 38 offres de `data/jobs.ts` comme jeu de démarrage de la base.

## 15. Limites connues et pièges

**Limites assumées** (choix de la phase 1, pas des bugs) :

- Aucun test automatisé. `lib/recherche.ts`, `lib/format.ts` et `lib/facettes.ts` sont
  écrits purs exactement pour être testés en premier (Vitest).
- Les filtres ne sont pas reflétés dans l'URL : une recherche n'est pas partageable.
- Pas de pagination : toutes les offres sont rendues d'un coup. À revoir au-delà de ~50.
- Pas de debounce sur la saisie ; inutile à cette volumétrie, à ajouter avec l'API.
- Les offres mises en avant apparaissent aussi dans la liste ; c'est volontaire, comme sur
  les job boards.
- Le filtre de salaire minimum **écarte les offres sans salaire annoncé**.
- Les sauvegardes et notes vivent dans le `localStorage` de l'appareil (clé
  `alternance.sauvegardes.v1`) ; changer la forme des données impose de changer la clé.

**Pièges techniques** :

- `dist/` et `node_modules/` sont ignorés par git : ne jamais les éditer.
- `.carte__lien::after` étend la zone cliquable à toute la carte. Tout élément interactif
  posé dans une carte doit donc porter `position: relative; z-index: 1`, sinon il devient
  inatteignable.
- L'événement `reset` du formulaire se déclenche **avant** que les champs soient vidés,
  d'où le `setTimeout(…, 0)` dans `page-recherche.ts`.
- Les dates ISO sont parsées en `T00:00:00` local pour éviter le décalage de fuseau : ne
  pas passer par `new Date(iso)` directement.
- Saisir une note sauvegarde implicitement l'offre : c'est voulu, les boutons de suivi se
  rafraîchissent pour le refléter.
