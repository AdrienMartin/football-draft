import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  fetchJsonWithRetries,
  loadEnvFiles,
  normalizeText,
  readJsonArray,
  uploadRemoteAsset,
  wait,
  writeJson,
} from './thesportsdb-storage-helpers.mjs';

const cwd = process.cwd();
loadEnvFiles(cwd);

const playersPath = process.argv[2] ?? path.join(cwd, 'public', 'data', 'players.json');
const outputPath = process.argv[3] ?? path.join(cwd, 'public', 'data', 'clubs_badges.json');
const bucketName = process.env.SUPABASE_CLUB_BADGES_BUCKET ?? 'club-badges';
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const requestDelayMs = Number.parseInt(process.env.THESPORTSDB_DELAY_MS ?? '900', 10);
const maxRetries = Number.parseInt(process.env.THESPORTSDB_MAX_RETRIES ?? '4', 10);

function buildClubKey(club, league) {
  return `${normalizeText(club)}__${normalizeText(league)}`;
}

function scoreTeamCandidate(target, candidate) {
  const candidateName = normalizeText(candidate.strTeam);
  const candidateLeague = normalizeText(candidate.strLeague ?? '');
  const clubName = normalizeText(target.club);
  const leagueName = normalizeText(target.league);

  let score = 0;

  if (candidateName === clubName) {
    score += 10;
  } else if (candidateName.includes(clubName) || clubName.includes(candidateName)) {
    score += 5;
  }

  if (candidateLeague && leagueName) {
    if (candidateLeague === leagueName) {
      score += 6;
    } else if (candidateLeague.includes(leagueName) || leagueName.includes(candidateLeague)) {
      score += 3;
    }
  }

  if (candidate.strBadge) {
    score += 2;
  }

  return score;
}

async function searchClubBadge(clubName) {
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(
    clubName,
  )}`;
  return fetchJsonWithRetries(url, clubName, requestDelayMs, maxRetries);
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Il manque SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY pour envoyer les badges clubs.',
    );
  }

  if (!fs.existsSync(playersPath)) {
    throw new Error(`Fichier joueurs introuvable: ${playersPath}`);
  }

  const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
  const clubs = [...new Map(players.map((player) => [buildClubKey(player.club, player.league), {
    club: player.club,
    league: player.league,
  }])).values()];
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const existingResults = readJsonArray(outputPath);
  const results = [...existingResults];
  const processedKeys = new Set(
    results
      .filter((entry) => entry?.club && entry?.league)
      .map((entry) => buildClubKey(entry.club, entry.league)),
  );

  for (const club of clubs) {
    const clubKey = buildClubKey(club.club, club.league);

    if (processedKeys.has(clubKey)) {
      continue;
    }

    try {
      const payload = await searchClubBadge(club.club);
      const candidates = Array.isArray(payload.teams) ? payload.teams : [];
      const bestCandidate = [...candidates]
        .sort((left, right) => scoreTeamCandidate(club, right) - scoreTeamCandidate(club, left))[0];
      const badgeUrl = bestCandidate?.strBadge ?? null;

      if (!bestCandidate || !badgeUrl) {
        await wait(requestDelayMs);
        continue;
      }

      const publicUrl = await uploadRemoteAsset({
        supabase,
        bucketName,
        storagePath: `clubs/${normalizeText(club.club).replaceAll(' ', '-')}.png`,
        sourceUrl: badgeUrl,
      });

      results.push({
        club: club.club,
        league: club.league,
        badgeUrl: publicUrl,
        badgeSource: 'TheSportsDB',
        sourceUrl: badgeUrl,
      });
      processedKeys.add(clubKey);
      writeJson(outputPath, results);

      console.log(`Badge récupéré pour ${club.club}`);
    } catch (error) {
      console.warn(
        `Badge ignoré pour ${club.club}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await wait(requestDelayMs);
  }

  writeJson(outputPath, results);
  console.log(`Fichier badges clubs généré: ${outputPath} (${results.length} badges)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
