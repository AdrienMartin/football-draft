import fs from 'node:fs';
import path from 'node:path';

const fetchImpl = globalThis.fetch.bind(globalThis);

export function loadEnvFiles(cwd = process.cwd()) {
  loadEnvFile(path.join(cwd, '.env'));
  loadEnvFile(path.join(cwd, '.env.local'));
}

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

export function wait(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function fetchJsonWithRetries(url, label, requestDelayMs, maxRetries) {
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

    throw new Error(`TheSportsDB a répondu ${response.status} pour ${label}.`);
  }

  throw new Error(`TheSportsDB n'a pas répondu correctement pour ${label}.`);
}

export async function uploadRemoteAsset({
  supabase,
  bucketName,
  storagePath,
  sourceUrl,
}) {
  const imageResponse = await fetchImpl(sourceUrl);

  if (!imageResponse.ok) {
    throw new Error(`Impossible de télécharger l'image ${sourceUrl}.`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const contentType = imageResponse.headers.get('content-type') ?? 'image/png';

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

export function readJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
