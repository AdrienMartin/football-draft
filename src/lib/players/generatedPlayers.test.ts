import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type GeneratedPlayer = {
  position: string;
  rating: number;
  stats: {
    goalkeeping?: number;
    shooting: number;
    passing: number;
    defense: number;
    pace: number;
    physical: number;
  };
};

describe('generated players dataset', () => {
  it('contains goalkeepers with dedicated goalkeeping ratings', () => {
    const datasetPath = path.join(process.cwd(), 'public', 'data', 'players.json');
    const raw = fs.readFileSync(datasetPath, 'utf8');
    const players = JSON.parse(raw) as GeneratedPlayer[];

    const goalkeepers = players.filter((player) => player.position === 'GK');

    expect(goalkeepers.length).toBeGreaterThan(0);
    expect(goalkeepers.every((player) => (player.stats.goalkeeping ?? 0) > 0)).toBe(true);
    expect(goalkeepers.some((player) => (player.stats.goalkeeping ?? 0) >= player.rating)).toBe(true);
  });

  it('keeps outfield players without inflated goalkeeping stats', () => {
    const datasetPath = path.join(process.cwd(), 'public', 'data', 'players.json');
    const raw = fs.readFileSync(datasetPath, 'utf8');
    const players = JSON.parse(raw) as GeneratedPlayer[];

    const outfieldPlayers = players.filter((player) => player.position !== 'GK').slice(0, 100);

    expect(outfieldPlayers.length).toBeGreaterThan(0);
    expect(
      outfieldPlayers.every((player) => !player.stats.goalkeeping || player.stats.goalkeeping === 0),
    ).toBe(true);
  });
});
