# Football Draft Game

Jeu de draft football en `React + TypeScript + Vite`.

Le principe :
- deux equipes composent un roster de `5 joueurs`
- la draft peut se jouer en `solo` contre l'IA ou en `multijoueur 1v1`
- une fois la draft terminee, le match est simule automatiquement avec un moteur base sur les attributs des joueurs

Le projet embarque aussi un pipeline de donnees pour generer le dataset joueurs, enrichir les photos et recuperer les badges clubs/championnats.

## Fonctionnalites

- draft `5v5` solo contre IA
- draft `5v5` multijoueur via Supabase
- pile ou face pour determiner le premier choix de draft
- filtres de draft : poste, nom, nationalite, championnat, club, age, valeur
- vue `Liste` et vue `Cartes` pour parcourir les joueurs
- simulation de match avec evenements, commentaires, mi-temps et fin de match
- photos joueurs via `TheSportsDB + Supabase Storage`
- badges clubs et championnats via `TheSportsDB + Supabase Storage`
- scripts de generation et d'enrichissement du dataset

## Stack

- `React 19`
- `TypeScript`
- `Vite`
- `Zustand`
- `Supabase`
- `Vitest`

## Installation

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Creer un fichier [\.env.local](C:/Users/adrie/Documents/New%20project/.env.local) :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_PLAYER_PHOTOS_BUCKET=player-photos
SUPABASE_CLUB_BADGES_BUCKET=club-badges
SUPABASE_LEAGUE_BADGES_BUCKET=league-badges
```

Important :
- `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont utilises par le front
- `SUPABASE_SERVICE_ROLE_KEY` sert uniquement aux scripts serveur
- ne commit jamais [\.env.local](C:/Users/adrie/Documents/New%20project/.env.local)

### 3. Lancer le projet

```bash
npm run dev
```

## Scripts utiles

### Developpement

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

### Donnees joueurs

```bash
npm run generate:players
npm run fetch:transfermarkt
npm run fetch:soccerdata
```

### Photos et badges

```bash
npm run fetch:player-photos
npm run fetch:club-badges
npm run fetch:league-badges
```

### Calibration du moteur de match

```bash
npm run calibrate:matches
```

Exemple :

```bash
npm run calibrate:matches -- --iterations=500 --pool-size=250 --min-rating=68
```

## Dataset

Le front charge principalement [players.json](C:/Users/adrie/Documents/New%20project/public/data/players.json).

Fichiers importants dans [public/data](C:/Users/adrie/Documents/New%20project/public/data) :

- [players.json](C:/Users/adrie/Documents/New%20project/public/data/players.json) : dataset final consomme par l'application
- [players_fbref.csv](C:/Users/adrie/Documents/New%20project/public/data/players_fbref.csv) : source stats FBref
- [players_sofascore.csv](C:/Users/adrie/Documents/New%20project/public/data/players_sofascore.csv) : source stats Sofascore
- [players_transfermarkt.csv](C:/Users/adrie/Documents/New%20project/public/data/players_transfermarkt.csv) : source Transfermarkt / valeur marchande
- [players_photos.json](C:/Users/adrie/Documents/New%20project/public/data/players_photos.json) : mapping photos joueurs
- [clubs_badges.json](C:/Users/adrie/Documents/New%20project/public/data/clubs_badges.json) : mapping badges clubs
- [leagues_badges.json](C:/Users/adrie/Documents/New%20project/public/data/leagues_badges.json) : mapping badges championnats

### Regenerer le dataset final

Quand les CSV sources ou les photos changent :

```bash
npm run generate:players
```

## Photos joueurs

Pipeline actuel :

1. recherche du joueur via `TheSportsDB`
2. upload de l'image dans `Supabase Storage`
3. ecriture du mapping dans [players_photos.json](C:/Users/adrie/Documents/New%20project/public/data/players_photos.json)
4. reinjection de `photoUrl` dans [players.json](C:/Users/adrie/Documents/New%20project/public/data/players.json)

Bucket recommande :
- `player-photos`

## Badges clubs et championnats

Pipeline actuel :

1. recherche du badge via `TheSportsDB`
2. upload dans `Supabase Storage`
3. ecriture des mappings JSON

Buckets recommandes :
- `club-badges`
- `league-badges`

## Multijoueur Supabase

Le mode `1v1` utilise Supabase pour :
- la creation de room
- la synchronisation de draft
- la synchronisation du match
- la revanche

Le schema SQL est dans :
- [multiplayer_rooms.sql](C:/Users/adrie/Documents/New%20project/supabase/multiplayer_rooms.sql)

Il faut appliquer ce script sur ton projet Supabase avant d'utiliser le multijoueur.

## Structure du projet

```text
src/
  components/
    draft/
    landing/
    layout/
    match/
    multiplayer/
    players/
    rules/
  lib/
    assets/
    game/
    multiplayer/
    players/
    supabase/
  pages/
  store/
  styles/
  types/

scripts/
public/data/
supabase/
```

## Tests

Le projet contient des tests sur plusieurs zones critiques :
- logique de draft
- filtres et tri
- moteur de simulation
- commentaires de match
- mapping multijoueur
- helpers d'affichage

Lancer toute la suite :

```bash
npm run test
```

## Notes de maintenance

- le projet utilise des donnees generees localement et des enrichissements externes
- les scripts `TheSportsDB` peuvent etre ralentis par du rate limiting
- les CSV sources sont utiles pour regenerer le dataset, mais le runtime du front depend surtout de [players.json](C:/Users/adrie/Documents/New%20project/public/data/players.json)

## Roadmap possible

- variantes de draft
- format `11v11`
- duree de match parametrable
- nouvelles sources de donnees joueurs
- affinage continu du moteur de match

