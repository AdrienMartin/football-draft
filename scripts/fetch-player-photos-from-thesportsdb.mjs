import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const fetchImpl = globalThis.fetch.bind(globalThis);
const cwd = process.cwd();

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalizedValue = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

    if (!(key in process.env)) {
      process.env[key] = normalizedValue;
    }
  });
}

loadEnvFile(path.join(cwd, '.env'));
loadEnvFile(path.join(cwd, '.env.local'));

const playersPath =
  process.argv[2] ?? path.join(cwd, 'public', 'data', 'players.json');
const outputPath =
  process.argv[3] ?? path.join(cwd, 'public', 'data', 'players_photos.json');
const bucketName = process.env.SUPABASE_PLAYER_PHOTOS_BUCKET ?? 'player-photos';
const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const requestDelayMs = Number.parseInt(process.env.THESPORTSDB_DELAY_MS ?? '900', 10);
const maxRetries = Number.parseInt(process.env.THESPORTSDB_MAX_RETRIES ?? '4', 10);

function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function buildPlayerKey(name, club) {
  return `${normalizeText(name)}__${normalizeText(club)}`;
}

function scoreCandidate(player, candidate) {
  const candidateName = normalizeText(candidate.strPlayer);
  const candidateClub = normalizeText(
    candidate.strTeam ?? candidate.strTeamCurrent ?? candidate.strTeamNationality ?? '',
  );
  const playerName = normalizeText(player.name);
  const playerClub = normalizeText(player.club);

  let score = 0;

  if (candidateName === playerName) {
    score += 10;
  } else if (candidateName.includes(playerName) || playerName.includes(candidateName)) {
    score += 5;
  }

  if (candidateClub && playerClub) {
    if (candidateClub === playerClub) {
      score += 8;
    } else if (candidateClub.includes(playerClub) || playerClub.includes(candidateClub)) {
      score += 3;
    }
  }

  if (candidate.strThumb) {
    score += 2;
  }

  if (candidate.strCutout) {
    score += 1;
  }

  return score;
}

async function fetchTheSportsDbPlayer(name) {
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchplayers.php?p=${encodeURIComponent(
    name,
  )}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const response = await fetchImpl(url);

    if (response.ok) {
      return response.json();
    }

    if (response.status === 429 && attempt < maxRetries) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = Number.parseInt(retryAfterHeader ?? '', 10);
      const retryDelay = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : requestDelayMs * (attempt + 2);

      await wait(retryDelay);
      continue;
    }

    throw new Error(`TheSportsDB a répondu ${response.status} pour ${name}.`);
  }

  throw new Error(`TheSportsDB n'a pas répondu correctement pour ${name}.`);
}

async function uploadPhoto(supabase, playerId, sourceUrl) {
  const imageResponse = await fetchImpl(sourceUrl);

  if (!imageResponse.ok) {
    throw new Error(`Impossible de télécharger l'image ${sourceUrl}.`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get('content-type') ?? 'image/jpeg';
  const extension =
    contentType.includes('png')
      ? 'png'
      : contentType.includes('webp')
        ? 'webp'
        : 'jpg';
  const storagePath = `players/${playerId}.${extension}`;

  const { error } = await supabase.storage.from(bucketName).upload(storagePath, arrayBuffer, {
    upsert: true,
    contentType,
  });

  if (error) {
    throw new Error(`Upload Supabase échoué pour ${storagePath}: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Il manque SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY pour envoyer les photos.',
    );
  }

  if (!fs.existsSync(playersPath)) {
    throw new Error(`Fichier joueurs introuvable: ${playersPath}`);
  }

  const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  const existingResults = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : [];
  const results = Array.isArray(existingResults) ? [...existingResults] : [];
  const processedKeys = new Set(
    results
      .filter((entry) => entry?.name && entry?.club)
      .map((entry) => buildPlayerKey(entry.name, entry.club)),
  );

  for (const player of players) {
    const playerKey = buildPlayerKey(player.name, player.club);

    if (processedKeys.has(playerKey)) {
      continue;
    }

    try {
      const payload = await fetchTheSportsDbPlayer(player.name);
      const candidates = Array.isArray(payload.player) ? payload.player : [];
      const bestCandidate = [...candidates]
        .sort((left, right) => scoreCandidate(player, right) - scoreCandidate(player, left))[0];
      const imageUrl = bestCandidate?.strThumb ?? bestCandidate?.strCutout ?? null;

      if (!bestCandidate || !imageUrl) {
        await wait(requestDelayMs);
        continue;
      }

      const publicUrl = await uploadPhoto(supabase, player.id, imageUrl);

      results.push({
        name: player.name,
        club: player.club,
        photoUrl: publicUrl,
        photoSource: 'TheSportsDB',
        sourceUrl: imageUrl,
      });
      processedKeys.add(playerKey);
      fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

      console.log(`Photo récupérée pour ${player.name}`);
    } catch (error) {
      console.warn(
        `Photo ignorée pour ${player.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    await wait(requestDelayMs);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  console.log(`Fichier photos généré: ${outputPath} (${results.length} photos)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
