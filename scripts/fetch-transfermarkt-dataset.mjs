import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cwd = process.cwd();
const datasetRef =
  process.argv[2] ?? process.env.KAGGLE_TRANSFERMARKT_DATASET ?? 'davidcariboo/player-scores';
const outputPath =
  process.argv[3] ?? path.join(cwd, 'public', 'data', 'players_transfermarkt.csv');

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function removeDirSafe(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function listFilesRecursively(rootPath) {
  const entries = fs.readdirSync(rootPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function pickPlayersCsv(files) {
  const normalized = files.map((filePath) => ({
    fullPath: filePath,
    baseName: path.basename(filePath).toLowerCase(),
  }));

  return (
    normalized.find((file) => file.baseName === 'players.csv')?.fullPath ??
    normalized.find((file) => file.baseName.endsWith('players.csv'))?.fullPath ??
    null
  );
}

function probeCommand(command, args) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: false,
  });
}

function resolveKaggleCommand() {
  if (process.env.KAGGLE_CLI_PATH) {
    return { command: process.env.KAGGLE_CLI_PATH, prefixArgs: [] };
  }

  for (const candidate of ['kaggle', 'kaggle.exe', 'kaggle.cmd']) {
    const result = probeCommand(candidate, ['--version']);
    if (!result.error && result.status === 0) {
      return { command: candidate, prefixArgs: [] };
    }
  }

  for (const candidate of ['python', 'py']) {
    const result = probeCommand(candidate, ['-m', 'kaggle', '--version']);
    if (!result.error && result.status === 0) {
      return { command: candidate, prefixArgs: ['-m', 'kaggle'] };
    }
  }

  const whereResult = probeCommand('where.exe', ['kaggle']);
  if (whereResult.status === 0) {
    const resolvedPath = whereResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean);

    if (resolvedPath) {
      return { command: resolvedPath, prefixArgs: [] };
    }
  }

  return null;
}

function runKaggleDownload(downloadDir) {
  const kaggleCommand = resolveKaggleCommand();

  if (!kaggleCommand) {
    throw new Error(
      [
        "Impossible d'executer la CLI Kaggle.",
        'Verifie que le terminal a bien ete redemarre apres la mise a jour du PATH,',
        'ou definis KAGGLE_CLI_PATH avec le chemin complet vers kaggle.exe.',
      ].join(' '),
    );
  }

  const result = probeCommand(kaggleCommand.command, [
    ...kaggleCommand.prefixArgs,
    'datasets',
    'download',
    '-d',
    datasetRef,
    '-p',
    downloadDir,
    '--unzip',
  ]);

  if (result.error) {
    throw new Error(`Impossible d'executer la CLI Kaggle via '${kaggleCommand.command}'.`);
  }

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() ||
        result.stdout?.trim() ||
        'Le telechargement Kaggle a echoue. Verifie tes credentials Kaggle.',
    );
  }
}

function main() {
  ensureParentDir(outputPath);

  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'football-draft-transfermarkt-'));

  try {
    runKaggleDownload(downloadDir);

    const files = listFilesRecursively(downloadDir);
    const playersCsvPath = pickPlayersCsv(files);

    if (!playersCsvPath) {
      const csvFiles = files
        .filter((filePath) => filePath.toLowerCase().endsWith('.csv'))
        .map((filePath) => path.relative(downloadDir, filePath));

      throw new Error(
        [
          "Le dataset Kaggle a bien ete telecharge, mais aucun fichier 'players.csv' n'a ete trouve.",
          csvFiles.length > 0
            ? `CSV detectes : ${csvFiles.join(', ')}`
            : "Aucun CSV detecte dans l'archive.",
        ].join(' '),
      );
    }

    fs.copyFileSync(playersCsvPath, outputPath);

    console.log(`Transfermarkt dataset downloaded from Kaggle dataset ${datasetRef}`);
    console.log(`Source CSV: ${playersCsvPath}`);
    console.log(`Saved to ${outputPath}`);
  } finally {
    removeDirSafe(downloadDir);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Echec du telechargement du dataset.');
  process.exitCode = 1;
}
