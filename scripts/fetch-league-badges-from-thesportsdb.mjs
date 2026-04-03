import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  fetchJsonWithRetries,
  loadEnvFiles,
  normalizeText,
  readJsonArray,
  uploadRemoteAsset,
  writeJson,
} from './thesportsdb-storage-helpers.mjs';

const cwd = process.cwd();
loadEnvFiles(cwd);

const playersPath = process.argv[2] ?? path.join(cwd, 'public', 'data', 'players.json');
const outputPath = process.argv[3] ?? path.join(cwd, 'public', 'data', 'leagues_badges.json');
const bucketName = process.env.SUPABASE_LEAGUE_BADGES_BUCKET ?? 'league-badges';
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const requestDelayMs = Number.parseInt(process.env.THESPORTSDB_DELAY_MS ?? '900', 10);
const maxRetries = Number.parseInt(process.env.THESPORTSDB_MAX_RETRIES ?? '4', 10);

const LEAGUE_IDS_BY_NAME = {
  'eng premier league': { idLeague: '4328', label: 'Premier League' },
  'de bundesliga': { idLeague: '4331', label: 'Bundesliga' },
  'it serie a': { idLeague: '4332', label: 'Serie A' },
  'fr ligue 1': { idLeague: '4334', label: 'Ligue 1' },
  'es la liga': { idLeague: '4335', label: 'La Liga' },
};

async function fetchLeagueBadge(idLeague, label) {
  const url = `https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=${encodeURIComponent(
    idLeague,
  )}`;
  return fetchJsonWithRetries(url, label, requestDelayMs, maxRetries);
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Il manque SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY pour envoyer les badges championnats.',
    );
  }

  if (!fs.existsSync(playersPath)) {
    throw new Error(`Fichier joueurs introuvable: ${playersPath}`);
  }

  const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
  const leagues = [...new Set(players.map((player) => player.league))];
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const existingResults = readJsonArray(outputPath);
  const results = [...existingResults];
  const processedKeys = new Set(
    results.filter((entry) => entry?.league).map((entry) => normalizeText(entry.league)),
  );

  for (const league of leagues) {
    const leagueKey = normalizeText(league);

    if (processedKeys.has(leagueKey)) {
      continue;
    }

    const leagueConfig = LEAGUE_IDS_BY_NAME[leagueKey];

    if (!leagueConfig) {
      console.warn(`Badge championnat ignoré pour ${league}: id TheSportsDB non configuré.`);
      continue;
    }

    try {
      const payload = await fetchLeagueBadge(leagueConfig.idLeague, leagueConfig.label);
      const badge = Array.isArray(payload.leagues) ? payload.leagues[0] : null;
      const badgeUrl = badge?.strBadge ?? null;

      if (!badge || !badgeUrl) {
        continue;
      }

      const publicUrl = await uploadRemoteAsset({
        supabase,
        bucketName,
        storagePath: `leagues/${leagueKey.replaceAll(' ', '-')}.png`,
        sourceUrl: badgeUrl,
      });

      results.push({
        league,
        badgeUrl: publicUrl,
        badgeSource: 'TheSportsDB',
        sourceUrl: badgeUrl,
        theSportsDbLeagueId: leagueConfig.idLeague,
      });
      processedKeys.add(leagueKey);
      writeJson(outputPath, results);

      console.log(`Badge récupéré pour ${league}`);
    } catch (error) {
      console.warn(
        `Badge championnat ignoré pour ${league}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  writeJson(outputPath, results);
  console.log(`Fichier badges championnats généré: ${outputPath} (${results.length} badges)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
