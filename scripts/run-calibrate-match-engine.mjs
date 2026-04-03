import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const compiledJsPath = resolve(root, 'tmp/calibration-dist/scripts/calibrate-match-engine.js');
const compiledCjsPath = resolve(root, 'tmp/calibration-dist/scripts/calibrate-match-engine.cjs');

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (process.platform === 'win32') {
  runCommand('cmd.exe', ['/d', '/s', '/c', 'npx tsc -p tsconfig.calibration.json']);
} else {
  runCommand('npx', ['tsc', '-p', 'tsconfig.calibration.json']);
}

mkdirSync(dirname(compiledCjsPath), { recursive: true });
copyFileSync(compiledJsPath, compiledCjsPath);

runCommand(process.execPath, [compiledCjsPath, ...process.argv.slice(2)]);
