import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const inputPath =
  process.argv[2] ??
  path.join(cwd, 'public', 'data', 'players_data_light-2025_2026.csv');
const outputPath =
  process.argv[3] ?? path.join(cwd, 'public', 'data', 'players.json');

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

  const normalized = Number.parseFloat(String(value).replace('%', ''));
  return Number.isFinite(normalized) ? normalized : 0;
}

function clamp(value, min = 1, max = 99) {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function per90(total, minutes) {
  if (!minutes || minutes <= 0) {
    return 0;
  }

  return (total / minutes) * 90;
}

function normalize(value, min, max) {
  if (max <= min) {
    return 50;
  }

  return ((value - min) / (max - min)) * 100;
}

function computeAvailability(row) {
  return (
    toNumber(row.MP) * 0.6 +
    toNumber(row.Starts) * 1.2 +
    toNumber(row['90s']) * 1.6 +
    toNumber(row.Min) / 180
  );
}

function computeRanges(rows) {
  const metrics = {
    shotThreat: [],
    playmaking: [],
    defending: [],
    mobility: [],
    physical: [],
    availability: [],
    goalkeeping: [],
  };

  rows.forEach((row) => {
    const gls = toNumber(row.Gls);
    const sot = toNumber(row.SoT);
    const sh = toNumber(row.Sh);
    const ast = toNumber(row.Ast);
    const tklw = toNumber(row.TklW);
    const interceptions = toNumber(row.Int);
    const crosses = toNumber(row.Crs);
    const foulsDrawn = toNumber(row.Fld);
    const foulsCommitted = toNumber(row.Fls);
    const savePct = toNumber(row['Save%']);
    const saves = toNumber(row.Saves);
    const savesAgainst = toNumber(row.SoTA);
    const goalsAgainstPer90 = toNumber(row.GA90);
    const csPct = toNumber(row['CS%']);
    const cleanSheets = toNumber(row.CS);
    const pkSaves = toNumber(row.PKsv);
    const availability = computeAvailability(row);

    metrics.shotThreat.push(
      gls * 16 +
        ast * 7 +
        toNumber(row['G+A']) * 5 +
        sh * 0.9 +
        sot * 2.4 +
        toNumber(row['Sh/90']) * 12 +
        toNumber(row['SoT/90']) * 18 +
        toNumber(row['G/Sh']) * 40 +
        toNumber(row['G/SoT']) * 22,
    );
    metrics.playmaking.push(
      ast * 18 + toNumber(row['G+A']) * 4 + crosses * 1.4 + foulsDrawn * 0.8,
    );
    metrics.defending.push(
      tklw * 2.7 + interceptions * 2.4 + toNumber(row.OG) * -8 + foulsCommitted * -0.4,
    );
    metrics.physical.push(
      tklw * 1.8 +
        interceptions * 1.2 +
        foulsDrawn * 1.6 +
        crosses * 0.3 -
        toNumber(row.CrdY) * 1.8 -
        toNumber(row.CrdR) * 6,
    );
    metrics.mobility.push(
      toNumber(row['Sh/90']) * 16 + toNumber(row['SoT/90']) * 10 + foulsDrawn * 0.9 + crosses * 0.45,
    );
    metrics.availability.push(availability);
    metrics.goalkeeping.push(
      savePct * 0.7 +
        saves * 1.2 +
        savesAgainst * 0.35 +
        csPct * 0.35 +
        cleanSheets * 0.8 +
        pkSaves * 6 -
        goalsAgainstPer90 * 9 +
        availability * 0.22,
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

function parseNation(raw) {
  if (!raw) {
    return 'Unknown';
  }

  const parts = raw.trim().split(/\s+/);
  return parts[parts.length - 1] || raw.trim();
}

function mapPosition(pos, row) {
  const parts = pos
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const isMixedAttacker = parts.includes('FW') && parts.includes('MF');
  const shootingOutput = toNumber(row.Gls) * 2 + toNumber(row.SoT) + toNumber(row['G+A']);
  const creativity = toNumber(row.Ast) * 4 + toNumber(row.Crs) + toNumber(row.Fld) * 0.5;
  const directness = toNumber(row['Sh/90']) * 14 + toNumber(row['SoT/90']) * 12;
  const defensiveWork = toNumber(row.TklW) + toNumber(row.Int);

  if (pos.includes('GK')) {
    return 'GK';
  }

  if (pos.includes('DF')) {
    const crossingLoad = toNumber(row.Crs);
    const defenseLoad = toNumber(row.TklW) + toNumber(row.Int);
    if (crossingLoad > defenseLoad * 0.45) {
      return 'RB';
    }
    return 'CB';
  }

  if (isMixedAttacker) {
    if (creativity > shootingOutput * 1.1 && defensiveWork > shootingOutput * 0.35) {
      return 'CAM';
    }

    if (creativity > shootingOutput * 1.15 && directness > toNumber(row.Sh) * 0.9) {
      return 'LW';
    }

    return 'CF';
  }

  if (pos.includes('MF')) {
    const defenseLoad = defensiveWork;
    const midfieldCreativity = toNumber(row.Ast) * 3 + toNumber(row.Crs) + toNumber(row.Fld) * 0.5;

    if (defenseLoad > midfieldCreativity * 0.85) {
      return 'CDM';
    }

    if (midfieldCreativity > defenseLoad * 1.15) {
      return 'CAM';
    }

    return 'CM';
  }

  if (pos.includes('FW')) {
    if (creativity > shootingOutput * 1.05) {
      return directness > toNumber(row.Sh) * 0.9 ? 'LW' : 'CF';
    }

    return 'ST';
  }

  return 'CM';
}

function applyPositionBias(position, baseStats) {
  const stats = { ...baseStats };

  if (position === 'CB') {
    stats.defense = clamp(stats.defense * 1.18);
    stats.physical = clamp(stats.physical * 1.1);
    stats.shooting = clamp(stats.shooting * 0.55);
  } else if (position === 'RB' || position === 'LB') {
    stats.pace = clamp(stats.pace * 1.1);
    stats.passing = clamp(stats.passing * 1.06);
    stats.defense = clamp(stats.defense * 1.02);
  } else if (position === 'CDM') {
    stats.defense = clamp(stats.defense * 1.12);
    stats.passing = clamp(stats.passing * 1.05);
    stats.shooting = clamp(stats.shooting * 0.8);
  } else if (position === 'CM') {
    stats.passing = clamp(stats.passing * 1.08);
    stats.physical = clamp(stats.physical * 1.04);
  } else if (position === 'CAM') {
    stats.passing = clamp(stats.passing * 1.14);
    stats.shooting = clamp(stats.shooting * 1.06);
    stats.pace = clamp(stats.pace * 1.03);
    stats.defense = clamp(stats.defense * 0.72);
  } else if (position === 'LW' || position === 'RW') {
    stats.pace = clamp(stats.pace * 1.18);
    stats.shooting = clamp(stats.shooting * 1.06);
    stats.passing = clamp(stats.passing * 1.1);
    stats.physical = clamp(stats.physical * 0.98);
    stats.defense = clamp(stats.defense * 0.68);
  } else if (position === 'CF') {
    stats.shooting = clamp(stats.shooting * 1.14);
    stats.passing = clamp(stats.passing * 1.12);
    stats.pace = clamp(stats.pace * 1.05);
    stats.physical = clamp(stats.physical * 1.02);
    stats.defense = clamp(stats.defense * 0.72);
  } else if (position === 'ST') {
    stats.shooting = clamp(stats.shooting * 1.22);
    stats.pace = clamp(stats.pace * 1.08);
    stats.passing = clamp(stats.passing * 0.86);
    stats.physical = clamp(stats.physical * 1.08);
    stats.defense = clamp(stats.defense * 0.4);
  }

  return stats;
}

function computeOutfieldStats(row, ranges, position) {
  const availability = computeAvailability(row);
  const shotThreat =
    toNumber(row.Gls) * 16 +
    toNumber(row.Ast) * 7 +
    toNumber(row['G+A']) * 5 +
    toNumber(row.Sh) * 0.9 +
    toNumber(row.SoT) * 2.4 +
    toNumber(row['Sh/90']) * 12 +
    toNumber(row['SoT/90']) * 18 +
    toNumber(row['G/Sh']) * 40 +
    toNumber(row['G/SoT']) * 22;
  const playmaking =
    toNumber(row.Ast) * 18 +
    toNumber(row['G+A']) * 4 +
    toNumber(row.Crs) * 1.4 +
    toNumber(row.Fld) * 0.8;
  const defending =
    toNumber(row.TklW) * 2.7 +
    toNumber(row.Int) * 2.4 -
    toNumber(row.OG) * 8 -
    toNumber(row.Fls) * 0.4;
  const physicalLoad =
    toNumber(row.TklW) * 1.8 +
    toNumber(row.Int) * 1.2 +
    toNumber(row.Fld) * 1.6 +
    toNumber(row.Crs) * 0.3 -
    toNumber(row.CrdY) * 1.8 -
    toNumber(row.CrdR) * 6;
  const paceLoad =
    toNumber(row['Sh/90']) * 16 +
    toNumber(row['SoT/90']) * 10 +
    toNumber(row.Fld) * 0.9 +
    toNumber(row.Crs) * 0.45;
  const availabilityBonus =
    normalize(availability, ranges.availability.min, ranges.availability.max) * 0.12;

  const baseStats = {
    pace: clamp(
      50 + normalize(paceLoad, ranges.mobility.min, ranges.mobility.max) * 0.38 + availabilityBonus * 0.45,
    ),
    shooting: clamp(
      48 + normalize(shotThreat, ranges.shotThreat.min, ranges.shotThreat.max) * 0.46 + availabilityBonus * 0.25,
    ),
    passing: clamp(
      50 + normalize(playmaking, ranges.playmaking.min, ranges.playmaking.max) * 0.42 + availabilityBonus * 0.3,
    ),
    defense: clamp(
      48 + normalize(defending, ranges.defending.min, ranges.defending.max) * 0.46 + availabilityBonus * 0.35,
    ),
    physical: clamp(
      50 + normalize(physicalLoad, ranges.physical.min, ranges.physical.max) * 0.38 + availabilityBonus * 0.55,
    ),
    goalkeeping: 0,
  };

  return applyPositionBias(position, baseStats);
}

function computeGoalkeeperStats(row, ranges) {
  const availability = computeAvailability(row);
  const goalkeepingRaw =
    toNumber(row['Save%']) * 0.7 +
    toNumber(row.Saves) * 1.2 +
    toNumber(row.SoTA) * 0.35 +
    toNumber(row['CS%']) * 0.35 +
    toNumber(row.CS) * 0.8 +
    toNumber(row.PKsv) * 6 -
    toNumber(row.GA90) * 9 +
    availability * 0.22;
  const availabilityBonus =
    normalize(availability, ranges.availability.min, ranges.availability.max) * 0.12;

  const goalkeeping = clamp(
    54 +
      normalize(goalkeepingRaw, ranges.goalkeeping.min, ranges.goalkeeping.max) * 0.44 +
      availabilityBonus * 0.45,
  );

  return {
    pace: clamp(34 + normalize(toNumber(row.Saves), 0, 160) * 0.16 + availabilityBonus * 0.15),
    shooting: 8,
    passing: clamp(
      38 + normalize(toNumber(row.W) - toNumber(row.L), -20, 20) * 0.18 + availabilityBonus * 0.2,
    ),
    defense: clamp(goalkeeping * 0.9),
    physical: clamp(
      48 + normalize(toNumber(row.SoTA) - toNumber(row.GA), 0, 120) * 0.32 + availabilityBonus * 0.5,
    ),
    goalkeeping,
  };
}

function computeRating(position, stats) {
  if (position === 'GK') {
    return clamp(
      stats.goalkeeping * 0.64 +
        stats.passing * 0.12 +
        stats.physical * 0.14 +
        stats.defense * 0.1,
      58,
      89,
    );
  }

  if (['CB', 'RB', 'LB'].includes(position)) {
    return clamp(
      stats.defense * 0.46 +
        stats.physical * 0.22 +
        stats.passing * 0.16 +
        stats.pace * 0.16,
      56,
      92,
    );
  }

  if (['CDM', 'CM', 'CAM'].includes(position)) {
    const passingWeight = position === 'CAM' ? 0.36 : 0.32;
    const shootingWeight = position === 'CAM' ? 0.22 : 0.18;
    const defenseWeight = position === 'CDM' ? 0.28 : 0.2;
    const paceWeight = position === 'CAM' ? 0.14 : 0.12;
    const physicalWeight = position === 'CDM' ? 0.2 : 0.18;

    return clamp(
      stats.passing * passingWeight +
        stats.defense * defenseWeight +
        stats.shooting * shootingWeight +
        stats.pace * paceWeight +
        stats.physical * physicalWeight,
      57,
      92,
    );
  }

  if (position === 'LW' || position === 'RW') {
    return clamp(
      stats.pace * 0.3 +
        stats.shooting * 0.28 +
        stats.passing * 0.24 +
        stats.physical * 0.14 +
        stats.defense * 0.04,
      58,
      93,
    );
  }

  if (position === 'CF') {
    return clamp(
      stats.shooting * 0.42 +
        stats.passing * 0.3 +
        stats.pace * 0.16 +
        stats.physical * 0.1 +
        stats.defense * 0.02,
      58,
      93,
    );
  }

  if (position === 'ST') {
    return clamp(
      stats.shooting * 0.54 +
        stats.pace * 0.22 +
        stats.passing * 0.1 +
        stats.physical * 0.12 +
        stats.defense * 0.02,
      58,
      94,
    );
  }

  return clamp(
    stats.shooting * 0.38 +
      stats.pace * 0.24 +
      stats.passing * 0.16 +
      stats.physical * 0.16 +
      stats.defense * 0.06,
    58,
    94,
  );
}

function computeValue(rating, age, position, stats) {
  const ageFactor = age <= 23 ? 1.18 : age <= 27 ? 1.08 : age <= 30 ? 0.96 : 0.82;
  const roleFactor = position === 'GK' ? 0.72 : position === 'ST' || position === 'CF' ? 1.15 : 1;
  const upside = position === 'GK' ? stats.goalkeeping : Math.max(stats.shooting, stats.passing);

  return Math.max(1, Math.round(((rating - 45) * 2.6 + upside * 0.55) * ageFactor * roleFactor));
}

function buildPlayer(row, index, ranges) {
  const primaryPosition = mapPosition(row.Pos || '', row);
  const age = Math.round(toNumber(row.Age));
  const stats =
    primaryPosition === 'GK'
      ? computeGoalkeeperStats(row, ranges)
      : computeOutfieldStats(row, ranges, primaryPosition);
  const rating = computeRating(primaryPosition, stats);
  const value = computeValue(rating, age, primaryPosition, stats);

  return {
    id: index + 1,
    name: row.Player,
    nationality: parseNation(row.Nation),
    club: row.Squad,
    league: row.Comp,
    age,
    position: primaryPosition,
    rating,
    value,
    stats,
  };
}

function main() {
  const csv = fs.readFileSync(inputPath, 'utf8');
  const rows = parseCsv(csv).filter((row) => row.Player && row.Squad);
  const ranges = computeRanges(rows);
  const players = rows
    .map((row, index) => buildPlayer(row, index, ranges))
    .sort((a, b) => b.rating - a.rating || b.value - a.value);

  fs.writeFileSync(outputPath, `${JSON.stringify(players, null, 2)}\n`, 'utf8');

  console.log(`Generated ${players.length} players into ${outputPath}`);
}

main();
