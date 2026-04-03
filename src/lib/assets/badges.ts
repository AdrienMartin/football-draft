type ClubBadgeEntry = {
  club: string;
  league: string;
  badgeUrl: string;
};

type LeagueBadgeEntry = {
  league: string;
  badgeUrl: string;
};

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

let clubBadgeByKey = new Map<string, string>();
let leagueBadgeByKey = new Map<string, string>();
let loadPromise: Promise<void> | null = null;

function buildClubBadgeMap(entries: ClubBadgeEntry[]) {
  return new Map(
    entries.map((entry) => [
      `${normalizeText(entry.club)}__${normalizeText(entry.league)}`,
      entry.badgeUrl,
    ]),
  );
}

function buildLeagueBadgeMap(entries: LeagueBadgeEntry[]) {
  return new Map(entries.map((entry) => [normalizeText(entry.league), entry.badgeUrl]));
}

export async function loadBadges() {
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = Promise.all([
    fetch('/data/clubs_badges.json').then((response) => {
      if (!response.ok) {
        throw new Error('Impossible de charger clubs_badges.json');
      }

      return response.json() as Promise<ClubBadgeEntry[]>;
    }),
    fetch('/data/leagues_badges.json').then((response) => {
      if (!response.ok) {
        throw new Error('Impossible de charger leagues_badges.json');
      }

      return response.json() as Promise<LeagueBadgeEntry[]>;
    }),
  ])
    .then(([clubEntries, leagueEntries]) => {
      clubBadgeByKey = buildClubBadgeMap(clubEntries);
      leagueBadgeByKey = buildLeagueBadgeMap(leagueEntries);
    })
    .catch((error) => {
      console.warn(error instanceof Error ? error.message : String(error));
      clubBadgeByKey = new Map();
      leagueBadgeByKey = new Map();
    });

  return loadPromise;
}

export function getClubBadgeUrl(club: string, league: string) {
  return clubBadgeByKey.get(`${normalizeText(club)}__${normalizeText(league)}`) ?? null;
}

export function getLeagueBadgeUrl(league: string) {
  return leagueBadgeByKey.get(normalizeText(league)) ?? null;
}
