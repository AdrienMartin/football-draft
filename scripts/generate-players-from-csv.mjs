import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const fbrefPath =
  process.argv[2] ?? path.join(cwd, 'public', 'data', 'players_fbref.csv');
const sofascorePath =
  process.argv[3] ?? path.join(cwd, 'public', 'data', 'players_sofascore.csv');
const transfermarktPath =
  process.argv[4] ?? path.join(cwd, 'public', 'data', 'players_transfermarkt.csv');
const understatPath =
  process.env.UNDERSTAT_DATA_PATH ??
  path.join(cwd, 'public', 'data', 'tmp', 'players_understat_soccerdata.csv');
const playerPhotosPath =
  process.env.PLAYER_PHOTOS_DATA_PATH ??
  path.join(cwd, 'public', 'data', 'players_photos.json');
const outputPath =
  process.argv[5] ?? path.join(cwd, 'public', 'data', 'players.json');

function getTransfermarktValue(row, ...keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return '';
}

function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }

      row.push(current);
      current = '';

      if (row.some((cell) => cell !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;

  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ''])),
  );
}

function toNumber(value) {
  if (!value || value === '') {
    return 0;
  }

  const normalized = Number.parseFloat(String(value).replace('%', '').replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : 0;
}

function clamp(value, min = 1, max = 99) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function softCap(value, pivot, strength) {
  if (value <= pivot) {
    return value;
  }

  return pivot + (value - pivot) * strength;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalize(value, min, max) {
  if (max <= min) {
    return 50;
  }

  return ((value - min) / (max - min)) * 100;
}

function similarity(left, right) {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  let overlap = 0;

  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.max(leftTokens.size, rightTokens.size, 1);
}

function buildPhotoKey(name, club) {
  return `${normalizeText(name)}__${normalizeText(club)}`;
}

function computeAvailability(row) {
  return (
    toNumber(row.MP) * 0.5 +
    toNumber(row.Starts) * 1.1 +
    toNumber(row['90s']) * 1.4 +
    toNumber(row.Min) / 220
  );
}

function computeStatConfidence(row) {
  const minutes = toNumber(row.Min);
  const starts = toNumber(row.Starts);
  const matches = toNumber(row.MP);
  const fullMatches = toNumber(row['90s']);

  const minuteShare = Math.min(minutes / 2600, 1);
  const startShare = Math.min(starts / 28, 1);
  const matchShare = Math.min(matches / 32, 1);
  const fullMatchShare = Math.min(fullMatches / 26, 1);

  return Math.max(
    0.18,
    Math.min(1, minuteShare * 0.48 + startShare * 0.24 + matchShare * 0.14 + fullMatchShare * 0.14),
  );
}

function computeUnderstatConfidence(understat) {
  if (!understat) {
    return 0;
  }

  const minuteShare = Math.min((understat.minutes ?? 0) / 2400, 1);
  const matchShare = Math.min((understat.matches ?? 0) / 30, 1);

  return Math.max(0, Math.min(1, minuteShare * 0.7 + matchShare * 0.3));
}

function getFbrefLeagueName(competition) {
  const normalized = normalizeText(competition);

  if (normalized.includes('premier league')) {
    return 'Premier League';
  }
  if (normalized.includes('la liga')) {
    return 'LaLiga';
  }
  if (normalized.includes('serie a')) {
    return 'Serie A';
  }
  if (normalized.includes('bundesliga')) {
    return 'Bundesliga';
  }
  if (normalized.includes('ligue 1')) {
    return 'Ligue 1';
  }

  return competition;
}

function parseNation(raw) {
  if (!raw) {
    return 'Unknown';
  }

  const parts = raw.trim().split(/\s+/);
  return parts[parts.length - 1] || raw.trim();
}

function applyNationalityOverrides(name, nationality) {
  const normalizedName = normalizeText(name);

  if (normalizedName === 'yael trepy' || normalizedName === 'nathan mbala') {
    return 'FRA';
  }

  if (normalizedName === 'andres antanon') {
    return 'ESP';
  }

  return nationality;
}

function applyAgeOverrides(name, age) {
  const normalizedName = normalizeText(name);

  if (
    normalizedName === 'yael trepy' ||
    normalizedName === 'cheveyo muy' ||
    normalizedName === 'andres antanon'
  ) {
    return 19;
  }

  return age;
}

function mapPosition(pos, transfermarktEntry) {
  const normalizedPos = normalizeText(pos);
  const subPosition = normalizeText(transfermarktEntry?.subPosition ?? '');

  if (normalizedPos.includes('gk') || subPosition.includes('goalkeeper')) {
    return 'GK';
  }

  if (subPosition.includes('centre back') || subPosition.includes('center back')) {
    return 'CB';
  }
  if (
    subPosition.includes('right back') ||
    subPosition.includes('left back') ||
    subPosition.includes('full back') ||
    subPosition.includes('wing back')
  ) {
    return 'RB';
  }
  if (subPosition.includes('defensive midfield')) {
    return 'CDM';
  }
  if (subPosition.includes('central midfield')) {
    return 'CM';
  }
  if (subPosition.includes('attacking midfield') || subPosition.includes('second striker')) {
    return 'CAM';
  }
  if (subPosition.includes('right winger')) {
    return 'RW';
  }
  if (subPosition.includes('left winger')) {
    return 'LW';
  }
  if (subPosition.includes('centre forward') || subPosition.includes('center forward')) {
    return 'ST';
  }

  const parts = pos
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.includes('DF')) {
    return 'CB';
  }
  if (parts.includes('MF') && parts.includes('FW')) {
    return 'CAM';
  }
  if (parts.includes('MF')) {
    return 'CM';
  }
  if (parts.includes('FW')) {
    return 'ST';
  }

  return 'CM';
}

function buildTransfermarktIndex(rows) {
  const index = new Map();

  rows
    .filter(
      (row) =>
        toNumber(getTransfermarktValue(row, 'market_value_in_eur', 'marketValueInEur')) > 0 &&
        toNumber(getTransfermarktValue(row, 'last_season', 'lastSeason')) >= 2024,
    )
    .forEach((row) => {
      const entry = {
        name: getTransfermarktValue(row, 'name', 'player_name', 'playerName'),
        club: getTransfermarktValue(row, 'current_club_name', 'club_name', 'clubName'),
        nationality: getTransfermarktValue(
          row,
          'country_of_citizenship',
          'nationality',
          'country',
        ),
        marketValueEur: Math.max(
          0,
          Math.round(toNumber(getTransfermarktValue(row, 'market_value_in_eur', 'marketValueInEur'))),
        ),
        highestMarketValueEur: Math.max(
          0,
          Math.round(
            toNumber(getTransfermarktValue(row, 'highest_market_value_in_eur', 'highestMarketValueInEur')),
          ),
        ),
        subPosition: getTransfermarktValue(row, 'sub_position', 'subPosition'),
        url: getTransfermarktValue(row, 'url', 'profile_url', 'profileUrl') || null,
        heightInCm: toNumber(getTransfermarktValue(row, 'height_in_cm', 'heightInCm')),
        clubKey: normalizeText(getTransfermarktValue(row, 'current_club_name', 'club_name', 'clubName')),
      };
      const nameKey = normalizeText(entry.name);
      const clubKey = normalizeText(entry.club);
      const compositeKey = `${nameKey}::${clubKey}`;
      const entries = index.get(nameKey) ?? [];

      entries.push(entry);
      index.set(nameKey, entries);
      index.set(compositeKey, [entry]);
    });

  return index;
}

function findTransfermarktEntry(row, transfermarktIndex) {
  const nameKey = normalizeText(row.Player);
  const clubKey = normalizeText(row.Squad);
  const compositeKey = `${nameKey}::${clubKey}`;
  const exactMatch = transfermarktIndex.get(compositeKey);

  if (exactMatch?.[0]) {
    return exactMatch[0];
  }

  const candidates = transfermarktIndex.get(nameKey) ?? [];

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1) {
    const bestClubMatch = candidates.find(
      (candidate) => similarity(clubKey, candidate.clubKey) >= 0.4,
    );
    if (bestClubMatch) {
      return bestClubMatch;
    }
    return candidates[0];
  }

  return null;
}

function buildSofascoreIndex(rows) {
  const byLeague = new Map();

  rows.forEach((row) => {
    const league = row.league || 'Unknown';
    const leagueRows = byLeague.get(league) ?? [];
    leagueRows.push(row);
    byLeague.set(league, leagueRows);
  });

  return byLeague;
}

function buildUnderstatIndex(rows) {
  const index = new Map();

  rows.forEach((row) => {
    const entry = {
      name: row.player,
      club: row.team,
      clubKey: normalizeText(row.team),
      goals: toNumber(row.goals),
      xg: toNumber(row.xg),
      assists: toNumber(row.assists),
      xa: toNumber(row.xa),
      shots: toNumber(row.shots),
      keyPasses: toNumber(row.key_passes),
      minutes: toNumber(row.minutes),
      matches: toNumber(row.matches),
      xgChain: toNumber(row.xg_chain),
      xgBuildup: toNumber(row.xg_buildup),
    };
    const nameKey = normalizeText(row.player);
    const clubKey = normalizeText(row.team);
    const compositeKey = `${nameKey}::${clubKey}`;
    const entries = index.get(nameKey) ?? [];

    entries.push(entry);
    index.set(nameKey, entries);
    index.set(compositeKey, [entry]);
  });

  return index;
}

function findUnderstatEntry(row, understatIndex) {
  const nameKey = normalizeText(row.Player);
  const clubKey = normalizeText(row.Squad);
  const compositeKey = `${nameKey}::${clubKey}`;
  const exactMatch = understatIndex.get(compositeKey);

  if (exactMatch?.[0]) {
    return exactMatch[0];
  }

  const candidates = understatIndex.get(nameKey) ?? [];

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (candidates.length > 1) {
    const bestClubMatch = candidates.find(
      (candidate) => similarity(clubKey, candidate.clubKey) >= 0.45,
    );

    if (bestClubMatch) {
      return bestClubMatch;
    }

    return candidates[0];
  }

  return null;
}

function scoreSofascoreCandidate(fbrefRow, sofascoreRow, isGoalkeeper) {
  const scores = [
    { weight: 0.24, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Min) - toNumber(sofascoreRow.minutes_played)) / 900, 1) },
    { weight: 0.1, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.MP) - toNumber(sofascoreRow.appearances)) / 12, 1) },
    { weight: 0.08, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Starts) - toNumber(sofascoreRow.matches_started)) / 10, 1) },
    { weight: 0.12, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Gls) - toNumber(sofascoreRow.goals)) / 10, 1) },
    { weight: 0.1, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Ast) - toNumber(sofascoreRow.assists)) / 8, 1) },
    { weight: 0.08, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Sh) - toNumber(sofascoreRow.total_shots)) / 40, 1) },
    { weight: 0.08, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.SoT) - toNumber(sofascoreRow.shots_on_target)) / 20, 1) },
    { weight: 0.05, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.CrdY) - toNumber(sofascoreRow.yellow_cards)) / 6, 1) },
    { weight: 0.03, value: 1 - Math.min(Math.abs(toNumber(fbrefRow.CrdR) - toNumber(sofascoreRow.red_cards)) / 2, 1) },
  ];

  if (isGoalkeeper) {
    scores.push({
      weight: 0.12,
      value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Saves) - toNumber(sofascoreRow.saves)) / 40, 1),
    });
  } else {
    scores.push({
      weight: 0.06,
      value: 1 - Math.min(Math.abs(toNumber(fbrefRow.TklW) - toNumber(sofascoreRow.tackles)) / 30, 1),
    });
    scores.push({
      weight: 0.04,
      value: 1 - Math.min(Math.abs(toNumber(fbrefRow.Int) - toNumber(sofascoreRow.interceptions)) / 20, 1),
    });
  }

  const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0);
  const weightedScore = scores.reduce((sum, score) => sum + score.weight * Math.max(0, score.value), 0);

  return weightedScore / totalWeight;
}

function matchSofascoreRows(fbrefRows, sofascoreByLeague) {
  const candidatePairs = [];

  fbrefRows.forEach((row, index) => {
    const league = getFbrefLeagueName(row.Comp);
    const leagueRows = sofascoreByLeague.get(league) ?? [];
    const isGoalkeeper = normalizeText(row.Pos).includes('gk');

    leagueRows.forEach((candidate) => {
      const score = scoreSofascoreCandidate(row, candidate, isGoalkeeper);

      if (score >= 0.78) {
        candidatePairs.push({
          fbrefIndex: index,
          sofascoreId: candidate.player_id,
          score,
          row: candidate,
        });
      }
    });
  });

  candidatePairs.sort((left, right) => right.score - left.score);

  const assignedFbref = new Set();
  const assignedSofascore = new Set();
  const matches = new Map();

  candidatePairs.forEach((pair) => {
    if (assignedFbref.has(pair.fbrefIndex) || assignedSofascore.has(pair.sofascoreId)) {
      return;
    }

    assignedFbref.add(pair.fbrefIndex);
    assignedSofascore.add(pair.sofascoreId);
    matches.set(pair.fbrefIndex, pair.row);
  });

  return matches;
}

function computeRanges(rows, sofascoreMatches, transfermarktEntries, understatEntries) {
  const metrics = {
    shooting: [],
    passing: [],
    dribbling: [],
    defense: [],
    pace: [],
    physical: [],
    vision: [],
    composure: [],
    tackling: [],
    positioning: [],
    crossing: [],
    goalkeeping: [],
    handling: [],
    reflexes: [],
    distribution: [],
    aerial: [],
    shotStopping: [],
    commandOfArea: [],
  };

  rows.forEach((row, index) => {
    const sofascore = sofascoreMatches.get(index);
    const transfermarkt = transfermarktEntries.get(index);
    const understat = understatEntries.get(index);
    const rating = toNumber(sofascore?.rating);
    const shots = understat?.shots || toNumber(sofascore?.total_shots) || toNumber(row.Sh);
    const shotsOnTarget = toNumber(sofascore?.shots_on_target) || toNumber(row.SoT);
    const tackles = toNumber(sofascore?.tackles) || toNumber(row.TklW);
    const interceptions = toNumber(sofascore?.interceptions) || toNumber(row.Int);
    const saves = toNumber(sofascore?.saves) || toNumber(row.Saves);
    const xg = understat?.xg || toNumber(sofascore?.expected_goals);
    const xa = understat?.xa || toNumber(sofascore?.expected_assists);
    const availability = computeAvailability(row);
    const marketValue = Math.max(0, Math.log2((transfermarkt?.marketValueEur ?? 0) / 1_000_000 + 1));
    const subPosition = normalizeText(transfermarkt?.subPosition ?? '');
    const wingerBias = subPosition.includes('winger') ? 8 : 0;
    const creatorBias = subPosition.includes('attacking midfield') ? 6 : 0;
    const understatConfidence = computeUnderstatConfidence(understat);
    const chainImpact = (understat?.xgChain ?? 0) * understatConfidence;
    const buildupImpact = (understat?.xgBuildup ?? 0) * understatConfidence;

    metrics.shooting.push(
      toNumber(row.Gls) * 15 +
        xg * 9 +
        shots * 0.7 +
        shotsOnTarget * 2.2 +
        toNumber(row['Sh/90']) * 8 +
        marketValue * 2,
    );
    metrics.passing.push(
      toNumber(row.Ast) * 14 +
        xa * 10 +
        (understat?.keyPasses ?? 0) * (0.5 + understatConfidence * 0.2) +
        toNumber(row.Crs) * 0.9 +
        rating * 5 +
        creatorBias,
    );
    metrics.dribbling.push(
      shotsOnTarget * 1.2 +
        toNumber(row.Fld) * 1.5 +
        chainImpact * 1.2 +
        buildupImpact * 0.9 +
        toNumber(row.Crs) * 0.4 +
        rating * 7 +
        wingerBias +
        creatorBias +
        marketValue * 2.5,
    );
    metrics.defense.push(
      tackles * 2.1 +
        interceptions * 2.2 +
        toNumber(row.TklW) * 1.2 +
        toNumber(row.Int) * 1.3 -
        toNumber(row.CrdR) * 6,
    );
    metrics.pace.push(
      toNumber(row['Sh/90']) * 10 +
        shotsOnTarget * 0.8 +
        toNumber(row.Fld) * 1.1 +
        chainImpact * 0.2 +
        rating * 4 +
        wingerBias +
        Math.max(0, 28 - toNumber(row.Age)) * 0.6,
    );
    metrics.physical.push(
      tackles * 1.4 +
        interceptions * 1 +
        availability * 0.9 +
        toNumber(row.Fld) * 1.2 +
        Math.max(0, toNumber(transfermarkt?.heightInCm) - 175) * 0.15,
    );
    metrics.vision.push(
      xa * 10 +
        (understat?.keyPasses ?? 0) * (0.55 + understatConfidence * 0.25) +
        buildupImpact * 1.2 +
        chainImpact * 0.45 +
        rating * 4.5 +
        creatorBias,
    );
    metrics.composure.push(
      toNumber(row.Gls) * 8 +
        xg * 4.5 +
        xa * 3.2 +
        shotsOnTarget * 1.2 +
        rating * 6 +
        availability * 0.25 -
        toNumber(row.CrdR) * 4,
    );
    metrics.tackling.push(
      tackles * 2.45 +
        interceptions * 1.3 +
        toNumber(row.TklW) * 1.35 +
        rating * 2 -
        toNumber(row.CrdR) * 5,
    );
    metrics.positioning.push(
      interceptions * 1.8 +
        toNumber(row.Gls) * 5 +
        xg * 4.5 +
        toNumber(row.CS) * 0.45 -
        toNumber(row.GA90) * 4 +
        rating * 4.8 +
        availability * 0.18,
    );
    metrics.crossing.push(
      toNumber(row.Crs) * 2.2 +
        xa * 3.5 +
        (understat?.keyPasses ?? 0) * 0.55 +
        rating * 3.4 +
        wingerBias +
        defenseBonusFromSubPosition(subPosition),
    );
    metrics.goalkeeping.push(
      toNumber(row['Save%']) * 1.25 +
        Math.min(saves, 85) * 0.45 +
        toNumber(row.CS) * 1.1 -
        toNumber(row.GA90) * 14 +
        rating * 4,
    );
    metrics.handling.push(
      toNumber(row['Save%']) * 0.8 +
        toNumber(row.CS) * 0.65 -
        toNumber(row.GA90) * 6 +
        rating * 2.5,
    );
    metrics.reflexes.push(
      Math.min(saves, 90) * 0.8 +
        toNumber(row['Save%']) * 0.55 -
        toNumber(row.GA90) * 2.5 +
        rating * 3.2,
    );
    metrics.distribution.push(rating * 6 + toNumber(row.Crs) * 0.25 + availability * 0.4);
    metrics.aerial.push(
      toNumber(row.CS) * 0.6 +
        Math.max(0, toNumber(transfermarkt?.heightInCm) - 180) * 0.35 +
        rating * 4,
    );
    metrics.shotStopping.push(
      toNumber(row['Save%']) * 1.15 +
        Math.min(saves, 85) * 0.42 -
        toNumber(row.GA90) * 12 +
        rating * 4,
    );
    metrics.commandOfArea.push(
      toNumber(row.CS) * 1 +
        Math.max(0, toNumber(transfermarkt?.heightInCm) - 182) * 0.4 +
        toNumber(row['Save%']) * 0.35 +
        rating * 3.2,
    );
  });

  return Object.fromEntries(
    Object.entries(metrics).map(([key, values]) => [
      key,
      {
        min: Math.min(...values),
        max: Math.max(...values),
      },
    ]),
  );
}

function defenseBonusFromSubPosition(subPosition) {
  if (
    subPosition.includes('left back') ||
    subPosition.includes('right back') ||
    subPosition.includes('wing back')
  ) {
    return 4;
  }

  return 0;
}

function buildOutfieldStats(row, sofascore, transfermarkt, understat, ranges, position) {
  const understatConfidence = computeUnderstatConfidence(understat);
  const understatXg = (understat?.xg ?? 0) * understatConfidence;
  const understatXa = (understat?.xa ?? 0) * understatConfidence;
  const understatShots = (understat?.shots ?? 0) * (0.35 + understatConfidence * 0.65);
  const understatKeyPasses =
    (understat?.keyPasses ?? 0) * (0.35 + understatConfidence * 0.45);
  const understatChain = (understat?.xgChain ?? 0) * understatConfidence;
  const understatBuildup = (understat?.xgBuildup ?? 0) * understatConfidence;

  const shootingRaw =
    toNumber(row.Gls) * 15 +
    (understatXg || toNumber(sofascore?.expected_goals)) * 9 +
    (understatShots || toNumber(sofascore?.total_shots) || toNumber(row.Sh)) * 0.7 +
    (toNumber(sofascore?.shots_on_target) || toNumber(row.SoT)) * 2.2 +
    toNumber(row['Sh/90']) * 8 +
    Math.log2((transfermarkt?.marketValueEur ?? 0) / 1_000_000 + 1) * 2;
  const passingRaw =
    toNumber(row.Ast) * 14 +
    (understatXa || toNumber(sofascore?.expected_assists)) * 10 +
    understatKeyPasses * 0.85 +
    toNumber(row.Crs) * 0.9 +
    toNumber(sofascore?.rating) * 5;
  const dribblingRaw =
    (toNumber(sofascore?.shots_on_target) || toNumber(row.SoT)) * 1.2 +
    toNumber(row.Fld) * 1.5 +
    understatChain * 0.7 +
    understatBuildup * 0.45 +
    toNumber(row.Crs) * 0.4 +
    toNumber(sofascore?.rating) * 7 +
    Math.log2((transfermarkt?.marketValueEur ?? 0) / 1_000_000 + 1) * 2.5;
  const defenseRaw =
    (toNumber(sofascore?.tackles) || toNumber(row.TklW)) * 2.1 +
    (toNumber(sofascore?.interceptions) || toNumber(row.Int)) * 2.2 +
    toNumber(row.TklW) * 1.2 +
    toNumber(row.Int) * 1.3 -
    toNumber(row.CrdR) * 6;
  const paceRaw =
    toNumber(row['Sh/90']) * 10 +
    (toNumber(sofascore?.shots_on_target) || toNumber(row.SoT)) * 0.8 +
    toNumber(row.Fld) * 1.1 +
    understatChain * 0.15 +
    toNumber(sofascore?.rating) * 4 +
    Math.max(0, 28 - toNumber(row.Age)) * 0.6;
  const physicalRaw =
    (toNumber(sofascore?.tackles) || toNumber(row.TklW)) * 1.4 +
    (toNumber(sofascore?.interceptions) || toNumber(row.Int)) * 1 +
    computeAvailability(row) * 0.9 +
    toNumber(row.Fld) * 1.2 +
    Math.max(0, toNumber(transfermarkt?.heightInCm) - 175) * 0.15;
  const visionRaw =
    (understatXa || toNumber(sofascore?.expected_assists)) * 10 +
    understatKeyPasses * 1.05 +
    understatBuildup * 1.2 +
    understatChain * 0.45 +
    toNumber(sofascore?.rating) * 4.5;
  const composureRaw =
    toNumber(row.Gls) * 8 +
    understatXg * 4.5 +
    understatXa * 3.2 +
    (toNumber(sofascore?.shots_on_target) || toNumber(row.SoT)) * 1.2 +
    toNumber(sofascore?.rating) * 6 +
    computeAvailability(row) * 0.25 -
    toNumber(row.CrdR) * 4;
  const tacklingRaw =
    (toNumber(sofascore?.tackles) || toNumber(row.TklW)) * 2.45 +
    (toNumber(sofascore?.interceptions) || toNumber(row.Int)) * 1.3 +
    toNumber(row.TklW) * 1.35 +
    toNumber(sofascore?.rating) * 2 -
    toNumber(row.CrdR) * 5;
  const positioningRaw =
    (toNumber(sofascore?.interceptions) || toNumber(row.Int)) * 1.8 +
    toNumber(row.Gls) * 5 +
    understatXg * 4.5 +
    toNumber(row.CS) * 0.45 -
    toNumber(row.GA90) * 4 +
    toNumber(sofascore?.rating) * 4.8 +
    computeAvailability(row) * 0.18;
  const crossingRaw =
    toNumber(row.Crs) * 2.2 +
    understatXa * 3.5 +
    understatKeyPasses * 0.55 +
    toNumber(sofascore?.rating) * 3.4;

  const stats = {
    pace: clamp(48 + normalize(paceRaw, ranges.pace.min, ranges.pace.max) * 0.4),
    shooting: clamp(48 + normalize(shootingRaw, ranges.shooting.min, ranges.shooting.max) * 0.45),
    passing: clamp(48 + normalize(passingRaw, ranges.passing.min, ranges.passing.max) * 0.43),
    dribbling: clamp(48 + normalize(dribblingRaw, ranges.dribbling.min, ranges.dribbling.max) * 0.44),
    defense: clamp(46 + normalize(defenseRaw, ranges.defense.min, ranges.defense.max) * 0.45),
    physical: clamp(48 + normalize(physicalRaw, ranges.physical.min, ranges.physical.max) * 0.38),
    vision: clamp(46 + normalize(visionRaw, ranges.vision.min, ranges.vision.max) * 0.44),
    composure: clamp(46 + normalize(composureRaw, ranges.composure.min, ranges.composure.max) * 0.42),
    tackling: clamp(46 + normalize(tacklingRaw, ranges.tackling.min, ranges.tackling.max) * 0.45),
    positioning: clamp(46 + normalize(positioningRaw, ranges.positioning.min, ranges.positioning.max) * 0.44),
    crossing: clamp(42 + normalize(crossingRaw, ranges.crossing.min, ranges.crossing.max) * 0.4),
    goalkeeping: 0,
    reflexes: 0,
    handling: 0,
    distribution: 0,
    aerial: 0,
    shotStopping: 0,
    commandOfArea: 0,
  };

  if (position === 'CB' || position === 'CDM') {
    stats.defense = clamp(softCap(stats.defense, 84, 0.45));
  }

  if (position === 'CB') {
    stats.physical = clamp(softCap(stats.physical, 82, 0.6));
  }

  if (position === 'CB') {
    stats.defense = clamp(stats.defense * 1.08);
    stats.physical = clamp(stats.physical * 1.1);
    stats.dribbling = clamp(stats.dribbling * 0.62);
    stats.pace = clamp(stats.pace * 0.86);
    stats.shooting = clamp(stats.shooting * 0.48);
    stats.tackling = clamp(stats.tackling * 1.14);
    stats.positioning = clamp(stats.positioning * 1.14);
    stats.vision = clamp(stats.vision * 0.78);
    stats.crossing = clamp(stats.crossing * 0.46);
  } else if (position === 'RB') {
    stats.pace = clamp(stats.pace * 1.1);
    stats.passing = clamp(stats.passing * 1.05);
    stats.dribbling = clamp(stats.dribbling * 1.04);
    stats.crossing = clamp(stats.crossing * 1.16);
    stats.tackling = clamp(stats.tackling * 1.06);
  } else if (position === 'CDM') {
    stats.defense = clamp(stats.defense * 1.1);
    stats.passing = clamp(stats.passing * 1.04);
    stats.dribbling = clamp(stats.dribbling * 0.9);
    stats.shooting = clamp(stats.shooting * 0.78);
    stats.tackling = clamp(stats.tackling * 1.12);
    stats.positioning = clamp(stats.positioning * 1.08);
    stats.vision = clamp(stats.vision * 1.02);
  } else if (position === 'CM') {
    stats.passing = clamp(stats.passing * 1.04);
    stats.dribbling = clamp(stats.dribbling * 1.02);
    stats.vision = clamp(stats.vision * 1.08);
    stats.composure = clamp(stats.composure * 1.04);
  } else if (position === 'CAM') {
    stats.passing = clamp(stats.passing * 1.1);
    stats.dribbling = clamp(stats.dribbling * 1.1);
    stats.shooting = clamp(stats.shooting * 1.03);
    stats.defense = clamp(stats.defense * 0.72);
    stats.vision = clamp(stats.vision * 1.16);
    stats.composure = clamp(stats.composure * 1.08);
    stats.positioning = clamp(stats.positioning * 1.06);
  } else if (position === 'LW' || position === 'RW') {
    stats.pace = clamp(stats.pace * 1.14);
    stats.dribbling = clamp(stats.dribbling * 1.14);
    stats.passing = clamp(stats.passing * 1.05);
    stats.defense = clamp(stats.defense * 0.66);
    stats.crossing = clamp(stats.crossing * 1.14);
    stats.composure = clamp(stats.composure * 1.05);
    stats.positioning = clamp(stats.positioning * 1.02);
  } else if (position === 'CF') {
    stats.shooting = clamp(stats.shooting * 1.08);
    stats.passing = clamp(stats.passing * 1.08);
    stats.dribbling = clamp(stats.dribbling * 1.08);
    stats.vision = clamp(stats.vision * 1.08);
    stats.composure = clamp(stats.composure * 1.1);
    stats.positioning = clamp(stats.positioning * 1.08);
  } else if (position === 'ST') {
    stats.shooting = clamp(stats.shooting * 1.16);
    stats.pace = clamp(stats.pace * 1.06);
    stats.dribbling = clamp(stats.dribbling * 1.04);
    stats.passing = clamp(stats.passing * 0.88);
    stats.defense = clamp(stats.defense * 0.4);
    stats.composure = clamp(stats.composure * 1.12);
    stats.positioning = clamp(stats.positioning * 1.14);
    stats.crossing = clamp(stats.crossing * 0.72);
  }

  return stats;
}

function buildGoalkeeperStats(row, sofascore, transfermarkt, ranges) {
  const goalkeepingRaw =
    toNumber(row['Save%']) * 1.25 +
    Math.min(toNumber(sofascore?.saves) || toNumber(row.Saves), 85) * 0.45 +
    toNumber(row.CS) * 1.1 -
    toNumber(row.GA90) * 14 +
    toNumber(sofascore?.rating) * 4;
  const handlingRaw =
    toNumber(row['Save%']) * 0.8 +
    toNumber(row.CS) * 0.65 -
    toNumber(row.GA90) * 6 +
    toNumber(sofascore?.rating) * 2.5;
  const reflexesRaw =
    Math.min(toNumber(sofascore?.saves) || toNumber(row.Saves), 90) * 0.8 +
    toNumber(row['Save%']) * 0.55 -
    toNumber(row.GA90) * 2.5 +
    toNumber(sofascore?.rating) * 3.2;
  const distributionRaw = toNumber(sofascore?.rating) * 6 + computeAvailability(row) * 0.4;
  const aerialRaw =
    toNumber(row.CS) * 0.6 +
    Math.max(0, toNumber(transfermarkt?.heightInCm) - 180) * 0.35 +
    toNumber(sofascore?.rating) * 4;
  const shotStoppingRaw =
    toNumber(row['Save%']) * 1.15 +
    Math.min(toNumber(sofascore?.saves) || toNumber(row.Saves), 85) * 0.42 -
    toNumber(row.GA90) * 12 +
    toNumber(sofascore?.rating) * 4;
  const commandOfAreaRaw =
    toNumber(row.CS) * 1 +
    Math.max(0, toNumber(transfermarkt?.heightInCm) - 182) * 0.4 +
    toNumber(row['Save%']) * 0.35 +
    toNumber(sofascore?.rating) * 3.2;

  const goalkeeping = clamp(
    54 + normalize(goalkeepingRaw, ranges.goalkeeping.min, ranges.goalkeeping.max) * 0.44,
  );
  const handling = clamp(
    50 + normalize(handlingRaw, ranges.handling.min, ranges.handling.max) * 0.38,
  );
  const reflexes = clamp(
    52 + normalize(reflexesRaw, ranges.reflexes.min, ranges.reflexes.max) * 0.4,
  );
  const distribution = clamp(
    42 + normalize(distributionRaw, ranges.distribution.min, ranges.distribution.max) * 0.36,
  );
  const aerial = clamp(
    48 + normalize(aerialRaw, ranges.aerial.min, ranges.aerial.max) * 0.34,
  );
  const shotStopping = clamp(
    50 + normalize(shotStoppingRaw, ranges.shotStopping.min, ranges.shotStopping.max) * 0.42,
  );
  const commandOfArea = clamp(
    48 + normalize(commandOfAreaRaw, ranges.commandOfArea.min, ranges.commandOfArea.max) * 0.38,
  );

  const marketValueMillions = (transfermarkt?.marketValueEur ?? 0) / 1_000_000;
  const peakMarketValueMillions = Math.max(
    marketValueMillions,
    (transfermarkt?.highestMarketValueEur ?? 0) / 1_000_000,
  );

  let tunedGoalkeeping = goalkeeping;
  let tunedReflexes = reflexes;
  let tunedHandling = handling;

  if (peakMarketValueMillions < 15) {
    tunedGoalkeeping = clamp(softCap(tunedGoalkeeping, 86, 0.45));
    tunedReflexes = clamp(softCap(tunedReflexes, 82, 0.52));
    tunedHandling = clamp(softCap(tunedHandling, 80, 0.52));
  } else if (peakMarketValueMillions < 30) {
    tunedGoalkeeping = clamp(softCap(tunedGoalkeeping, 88, 0.58));
    tunedReflexes = clamp(softCap(tunedReflexes, 84, 0.65));
    tunedHandling = clamp(softCap(tunedHandling, 82, 0.65));
  }

  return {
    pace: clamp(34 + normalize(reflexesRaw, ranges.reflexes.min, ranges.reflexes.max) * 0.12),
    shooting: 8,
    passing: distribution,
    dribbling: clamp(20 + distribution * 0.24),
    defense: clamp(tunedGoalkeeping * 0.9),
    physical: clamp(48 + normalize(aerialRaw, ranges.aerial.min, ranges.aerial.max) * 0.28),
    vision: clamp(32 + distribution * 0.38),
    composure: clamp(42 + (tunedHandling * 0.36 + tunedGoalkeeping * 0.18)),
    tackling: 18,
    positioning: clamp(44 + (commandOfArea * 0.26 + tunedGoalkeeping * 0.18)),
    crossing: 10,
    goalkeeping: tunedGoalkeeping,
    reflexes: tunedReflexes,
    handling: tunedHandling,
    distribution,
    aerial,
    shotStopping,
    commandOfArea,
  };
}

function computeBaseOverall(position, stats) {
  if (position === 'GK') {
    return clamp(
      stats.goalkeeping * 0.46 +
        (stats.reflexes ?? stats.goalkeeping ?? 50) * 0.22 +
        (stats.handling ?? stats.goalkeeping ?? 50) * 0.18 +
        (stats.distribution ?? stats.passing) * 0.08 +
        (stats.aerial ?? stats.physical) * 0.03 +
        stats.physical * 0.03,
      58,
      88,
    );
  }

  if (position === 'CB') {
    return clamp(
      stats.defense * 0.56 +
        stats.physical * 0.24 +
        stats.passing * 0.08 +
        stats.pace * 0.08 +
        stats.dribbling * 0.02,
      56,
      88,
    );
  }

  if (position === 'RB') {
    return clamp(
      stats.defense * 0.3 +
        stats.pace * 0.24 +
        stats.passing * 0.2 +
        stats.dribbling * 0.14 +
        stats.physical * 0.12,
      56,
      86,
    );
  }

  if (position === 'CDM') {
    return clamp(
      stats.defense * 0.35 +
        stats.passing * 0.24 +
        stats.physical * 0.2 +
        stats.dribbling * 0.08 +
        stats.pace * 0.05 +
        stats.shooting * 0.06,
      57,
      88,
    );
  }

  if (position === 'CM') {
    return clamp(
      stats.passing * 0.3 +
        stats.dribbling * 0.18 +
        stats.defense * 0.16 +
        stats.shooting * 0.1 +
        stats.pace * 0.06 +
        stats.physical * 0.16,
      57,
      88,
    );
  }

  if (position === 'CAM') {
    return clamp(
      stats.passing * 0.28 +
        stats.dribbling * 0.24 +
        stats.shooting * 0.18 +
        stats.pace * 0.1 +
        stats.physical * 0.08 +
        stats.defense * 0.06,
      58,
      89,
    );
  }

  if (position === 'LW' || position === 'RW') {
    return clamp(
      stats.pace * 0.22 +
        stats.dribbling * 0.22 +
        stats.shooting * 0.2 +
        stats.passing * 0.16 +
        stats.physical * 0.1 +
        stats.defense * 0.04,
      58,
      89,
    );
  }

  if (position === 'CF') {
    return clamp(
      stats.shooting * 0.34 +
        stats.passing * 0.22 +
        stats.dribbling * 0.2 +
        stats.pace * 0.1 +
        stats.physical * 0.08 +
        stats.defense * 0.02,
      58,
      89,
    );
  }

  return clamp(
    stats.shooting * 0.44 +
      stats.pace * 0.16 +
      stats.passing * 0.1 +
      stats.dribbling * 0.1 +
      stats.physical * 0.12 +
      stats.defense * 0.02,
    58,
    90,
  );
}

function computeSofascoreOverall(sofascoreRating) {
  if (!sofascoreRating) {
    return 0;
  }

  return clamp(54 + (sofascoreRating - 6) * 16, 56, 89);
}

function computeTransfermarktOverall(
  marketValueEur,
  highestMarketValueEur,
  age,
  position,
) {
  if ((!marketValueEur || marketValueEur <= 0) && (!highestMarketValueEur || highestMarketValueEur <= 0)) {
    return 0;
  }

  const currentMarketValue = Math.max(0, marketValueEur);
  const peakMarketValue = Math.max(currentMarketValue, highestMarketValueEur || 0);
  const peakShare =
    position === 'GK'
      ? age >= 31
        ? 0.74
        : age >= 28
          ? 0.58
          : 0.28
      : age >= 31
        ? 0.7
        : age >= 28
          ? 0.5
          : 0.22;
  const effectiveMarketValue = Math.max(
    currentMarketValue,
    currentMarketValue * (1 - peakShare) + peakMarketValue * peakShare,
  );
  const roleOffset = position === 'GK' ? -1.5 : position === 'ST' || position === 'CF' ? 1 : 0;

  return clamp(54 + Math.log2(effectiveMarketValue / 1_000_000 + 1) * 5.1 + roleOffset, 56, 89);
}

function computeEliteRoleBonus(position, stats, age, marketValueMillions, sofascoreRating) {
  const sofaBonus = sofascoreRating >= 7.45 ? 0.9 : sofascoreRating >= 7.2 ? 0.45 : 0;

  if (position === 'GK') {
    let bonus = 0;
    if ((stats.goalkeeping ?? 0) >= 90) {
      bonus += 1.4;
    }
    if ((stats.reflexes ?? 0) >= 82 && (stats.handling ?? 0) >= 80) {
      bonus += 0.9;
    }
    if (marketValueMillions >= 40) {
      bonus += 0.8;
    }
    if (age >= 29 && (stats.goalkeeping ?? 0) >= 81 && (stats.handling ?? 0) >= 77) {
      bonus += 1.1;
    }
    if (marketValueMillions >= 15 && age >= 30) {
      bonus += 1;
    }
    if ((stats.aerial ?? 0) >= 77) {
      bonus += 0.25;
    }
    return bonus + sofaBonus;
  }

  if (position === 'CB') {
    let bonus = 0;
    if (stats.defense >= 88) {
      bonus += 1.5;
    }
    if (stats.physical >= 70) {
      bonus += 0.8;
    }
    if (marketValueMillions >= 70) {
      bonus += 1.2;
    }
    if (marketValueMillions >= 35) {
      bonus += 0.55;
    }
    if (age >= 29 && stats.defense >= 68 && stats.physical >= 70) {
      bonus += 1.35;
    }
    if (marketValueMillions >= 15 && age >= 30) {
      bonus += 1;
    }
    return bonus + sofaBonus * 0.7;
  }

  if (position === 'CDM' || position === 'CM') {
    let bonus = 0;
    if (stats.passing >= 72) {
      bonus += 0.7;
    }
    if (stats.defense >= 68) {
      bonus += 0.6;
    }
    if (stats.physical >= 68) {
      bonus += 0.35;
    }
    if (marketValueMillions >= 90) {
      bonus += 0.7;
    }
    if (stats.passing >= 55 && stats.defense >= 66 && stats.physical >= 62) {
      bonus += 0.7;
    }
    if (age >= 27 && stats.passing >= 54 && stats.defense >= 65) {
      bonus += 0.45;
    }
    return bonus + sofaBonus * 0.65;
  }

  if (position === 'CAM') {
    let bonus = 0;
    if (stats.passing >= 78) {
      bonus += 0.55;
    }
    if (stats.dribbling >= 86) {
      bonus += 0.55;
    }
    if (marketValueMillions >= 90) {
      bonus += 0.45;
    }
    if (age >= 29 && stats.passing >= 70 && sofascoreRating >= 7.2) {
      bonus += 0.5;
    }
    if (age >= 29 && stats.passing >= 64 && stats.dribbling >= 74) {
      bonus += 0.9;
    }
    if (stats.passing >= 68 && stats.dribbling >= 76 && stats.physical >= 64) {
      bonus += 0.4;
    }
    if (marketValueMillions >= 25 && age >= 29) {
      bonus += 1;
    }
    return bonus + sofaBonus * 0.45;
  }

  if (position === 'RB') {
    let bonus = 0;
    if (stats.pace >= 56 && stats.dribbling >= 69) {
      bonus += 0.55;
    }
    if (stats.passing >= 58 && stats.defense >= 53) {
      bonus += 0.4;
    }
    if (marketValueMillions >= 70) {
      bonus += 0.75;
    }
    return bonus + sofaBonus * 0.4;
  }

  if (position === 'ST' || position === 'CF' || position === 'LW' || position === 'RW') {
    let bonus = 0;
    if (stats.shooting >= 88) {
      bonus += 0.85;
    }
    if (stats.dribbling >= 86) {
      bonus += 0.45;
    }
    if (stats.passing >= 74 && (position === 'RW' || position === 'LW' || position === 'CF')) {
      bonus += 0.35;
    }
    if (age >= 30 && (stats.shooting >= 86 || stats.passing >= 76) && sofascoreRating >= 7.15) {
      bonus += 1.15;
    }
    if (age >= 30 && ((stats.shooting >= 78 && position === 'ST') || (stats.passing >= 70 && stats.dribbling >= 82))) {
      bonus += 1.1;
    }
    if (age >= 32 && (stats.shooting >= 76 || stats.passing >= 68)) {
      bonus += 0.7;
    }
    if (marketValueMillions >= 80) {
      bonus += 0.45;
    }
    if (marketValueMillions >= 25 && age >= 30) {
      bonus += 1.25;
    }
    return bonus + sofaBonus * 0.4;
  }

  return 0;
}

function computeVeteranEliteFloor(position, age, currentMarketValueMillions, peakMarketValueMillions) {
  if (age < 29 || peakMarketValueMillions < 70 || currentMarketValueMillions < 8) {
    return 0;
  }

  if (position === 'GK') {
    if (peakMarketValueMillions >= 90) {
      return 80;
    }
    if (peakMarketValueMillions >= 70) {
      return 78;
    }
    return 0;
  }

  if (position === 'CB') {
    if (peakMarketValueMillions >= 100) {
      return 78;
    }
    if (peakMarketValueMillions >= 75) {
      return 76;
    }
    return 0;
  }

  if (position === 'CM' || position === 'CDM' || position === 'CAM') {
    if (peakMarketValueMillions >= 100) {
      return 78;
    }
    if (peakMarketValueMillions >= 80) {
      return 76;
    }
    return 0;
  }

  if (position === 'ST' || position === 'CF' || position === 'RW' || position === 'LW') {
    if (peakMarketValueMillions >= 120) {
      return 80;
    }
    if (peakMarketValueMillions >= 90) {
      return 78;
    }
    if (peakMarketValueMillions >= 70) {
      return 76;
    }
  }

  return 0;
}

function computeFinalOverall(baseOverall, sofascoreRating, transfermarkt, age, position, row, stats) {
  const sofascoreOverall = computeSofascoreOverall(sofascoreRating);
  const transfermarktOverall = computeTransfermarktOverall(
    transfermarkt?.marketValueEur ?? 0,
    transfermarkt?.highestMarketValueEur ?? 0,
    age,
    position,
  );
  const marketValueMillions = (transfermarkt?.marketValueEur ?? 0) / 1_000_000;
  const peakMarketValueMillions = Math.max(
    marketValueMillions,
    (transfermarkt?.highestMarketValueEur ?? 0) / 1_000_000,
  );
  const statConfidence = computeStatConfidence(row);
  const hasSofascore = sofascoreOverall > 0;
  const hasTransfermarkt = transfermarktOverall > 0;

  let blended = baseOverall;

  if (hasSofascore) {
    blended =
      baseOverall * (0.66 + statConfidence * 0.06) +
      sofascoreOverall * (0.34 - statConfidence * 0.06);
  }

  if (!hasTransfermarkt) {
    return clamp(blended, 56, 89);
  }

  const transfermarktTrust =
    marketValueMillions >= 120
      ? 0.34
      : marketValueMillions >= 80
        ? 0.28
        : marketValueMillions >= 40
          ? 0.22
          : 0.16;
  const dynamicTmWeight = transfermarktTrust * (1 - statConfidence * 0.58);

  blended = blended * (1 - dynamicTmWeight) + transfermarktOverall * dynamicTmWeight;

  const lowerTolerance =
    marketValueMillions >= 150
      ? 1.5
      : marketValueMillions >= 100
        ? 2.25
        : marketValueMillions >= 60
          ? 3.25
          : marketValueMillions >= 30
            ? 4.25
            : 5.5;
  const upperTolerance =
    marketValueMillions >= 120
      ? 5.5
      : marketValueMillions >= 80
        ? 6.25
        : marketValueMillions >= 40
          ? 7
          : 8;
  const lowerGap = transfermarktOverall - blended - lowerTolerance;
  const upperGap = blended - transfermarktOverall - upperTolerance;

  if (lowerGap > 0) {
    blended += lowerGap * (0.42 + (1 - statConfidence) * 0.28);
  }

  if (upperGap > 0) {
    blended -= upperGap * (0.18 + statConfidence * 0.16);
  }

  blended += computeEliteRoleBonus(position, stats, age, marketValueMillions, sofascoreRating);

  if (marketValueMillions > 0) {
    const marketFloor =
      marketValueMillions >= 150
        ? 81
        : marketValueMillions >= 100
          ? 79
          : marketValueMillions >= 70
            ? 77
            : marketValueMillions >= 45
              ? 74
              : marketValueMillions >= 25
                ? 71
                : 0;
    const cbFloorBonus = position === 'CB' && marketValueMillions >= 35 ? 2 : 0;
    const goalkeeperFloorBonus = position === 'GK' && marketValueMillions >= 25 ? 2 : 0;
    const veteranAttackFloorBonus =
      (position === 'ST' || position === 'CF' || position === 'RW' || position === 'LW') &&
      age >= 30 &&
      marketValueMillions >= 25
        ? 2
        : 0;
    const veteranCreatorFloorBonus =
      (position === 'CAM' || position === 'CM') &&
      age >= 29 &&
      marketValueMillions >= 25
        ? 2
        : 0;
    const effectiveFloor =
      marketFloor +
      cbFloorBonus +
      goalkeeperFloorBonus +
      veteranAttackFloorBonus +
      veteranCreatorFloorBonus;

    if (effectiveFloor > 0) {
      blended = Math.max(blended, effectiveFloor);
    }
  }

  const veteranEliteFloor = computeVeteranEliteFloor(
    position,
    age,
    marketValueMillions,
    peakMarketValueMillions,
  );
  if (veteranEliteFloor > 0) {
    blended = Math.max(blended, veteranEliteFloor);
  }

  if (
    position === 'CB' &&
    marketValueMillions < 25 &&
    peakMarketValueMillions < 35 &&
    stats.defense >= 84
  ) {
    blended -= 5;
  } else if (
    position === 'CB' &&
    marketValueMillions < 35 &&
    peakMarketValueMillions < 45 &&
    stats.defense >= 80
  ) {
    blended -= 3;
  }

  if (
    position === 'GK' &&
    marketValueMillions < 5 &&
    peakMarketValueMillions < 15 &&
    (stats.goalkeeping ?? 0) >= 90
  ) {
    blended -= 8;
  } else if (
    position === 'GK' &&
    marketValueMillions < 10 &&
    peakMarketValueMillions < 25 &&
    (stats.goalkeeping ?? 0) >= 88
  ) {
    blended -= 6;
  } else if (
    position === 'GK' &&
    marketValueMillions < 15 &&
    peakMarketValueMillions < 35 &&
    (stats.goalkeeping ?? 0) >= 86
  ) {
    blended -= 3;
  }

  return clamp(blended, 56, 89);
}

function buildPlayer(row, index, sofascore, transfermarkt, understat, ranges, photoEntry = null) {
  const position = mapPosition(row.Pos || '', transfermarkt);
  const age = applyAgeOverrides(row.Player, Math.round(toNumber(row.Age)));
  const stats =
    position === 'GK'
      ? buildGoalkeeperStats(row, sofascore, transfermarkt, ranges)
      : buildOutfieldStats(row, sofascore, transfermarkt, understat, ranges, position);
  const rating = computeFinalOverall(
    computeBaseOverall(position, stats),
    toNumber(sofascore?.rating),
    transfermarkt,
    age,
    position,
    row,
    stats,
  );
  const value =
    transfermarkt?.marketValueEur && transfermarkt.marketValueEur > 0
      ? Math.max(1, Math.round(transfermarkt.marketValueEur / 1_000_000))
      : Math.max(1, Math.round(rating - 45));

  return {
    id: index + 1,
    name: row.Player,
    nationality: applyNationalityOverrides(
      row.Player,
      parseNation(row.Nation) === 'Unknown'
        ? transfermarkt?.nationality ?? 'Unknown'
        : parseNation(row.Nation),
    ),
    club: row.Squad,
    league: row.Comp,
    age,
    position,
    rating,
    value,
    marketValueEur: transfermarkt?.marketValueEur || undefined,
    transfermarktUrl: transfermarkt?.url ?? null,
    photoUrl: photoEntry?.photoUrl ?? null,
    stats,
  };
}

function main() {
  const fbrefRows = parseCsv(fs.readFileSync(fbrefPath, 'utf8')).filter(
    (row) => row.Player && row.Squad,
  );
  const sofascoreRows = parseCsv(fs.readFileSync(sofascorePath, 'utf8'));
  const transfermarktRows = parseCsv(fs.readFileSync(transfermarktPath, 'utf8'));
  const understatRows = fs.existsSync(understatPath)
    ? parseCsv(fs.readFileSync(understatPath, 'utf8'))
    : [];
  const playerPhotoEntries = fs.existsSync(playerPhotosPath)
    ? JSON.parse(fs.readFileSync(playerPhotosPath, 'utf8'))
    : [];

  const transfermarktIndex = buildTransfermarktIndex(transfermarktRows);
  const understatIndex = buildUnderstatIndex(understatRows);
  const playerPhotosByKey = new Map(
    playerPhotoEntries
      .filter((entry) => entry?.name && entry?.club && entry?.photoUrl)
      .map((entry) => [buildPhotoKey(entry.name, entry.club), entry]),
  );
  const transfermarktEntries = new Map();
  const understatEntries = new Map();

  fbrefRows.forEach((row, index) => {
    transfermarktEntries.set(index, findTransfermarktEntry(row, transfermarktIndex));
    understatEntries.set(index, findUnderstatEntry(row, understatIndex));
  });

  const sofascoreMatches = matchSofascoreRows(fbrefRows, buildSofascoreIndex(sofascoreRows));
  const ranges = computeRanges(fbrefRows, sofascoreMatches, transfermarktEntries, understatEntries);

  let transfermarktMatchCount = 0;
  let sofascoreMatchCount = 0;
  let understatMatchCount = 0;

  const players = fbrefRows
    .map((row, index) => {
      const transfermarktEntry = transfermarktEntries.get(index) ?? null;
      const sofascoreEntry = sofascoreMatches.get(index) ?? null;
      const understatEntry = understatEntries.get(index) ?? null;

      if (transfermarktEntry) {
        transfermarktMatchCount += 1;
      }

      if (sofascoreEntry) {
        sofascoreMatchCount += 1;
      }

      if (understatEntry) {
        understatMatchCount += 1;
      }

      const photoEntry = playerPhotosByKey.get(buildPhotoKey(row.Player, row.Squad)) ?? null;

      return buildPlayer(
        row,
        index,
        sofascoreEntry,
        transfermarktEntry,
        understatEntry,
        ranges,
        photoEntry,
      );
    })
    .sort((a, b) => b.rating - a.rating || b.value - a.value);

  fs.writeFileSync(outputPath, `${JSON.stringify(players, null, 2)}\n`, 'utf8');

  console.log(
    `Generated ${players.length} players into ${outputPath} (${transfermarktMatchCount} matched with Transfermarkt, ${sofascoreMatchCount} matched with Sofascore, ${understatMatchCount} matched with Understat)`,
  );
}

main();
