import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type GeneratedPlayer = {
  name: string;
  age: number;
  position: string;
  rating: number;
  stats: {
    goalkeeping?: number;
    vision?: number;
    composure?: number;
    tackling?: number;
    positioning?: number;
    crossing?: number;
    shotStopping?: number;
    commandOfArea?: number;
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

  it('contains the newer secondary attributes used by the match engine', () => {
    const datasetPath = path.join(process.cwd(), 'public', 'data', 'players.json');
    const raw = fs.readFileSync(datasetPath, 'utf8');
    const players = JSON.parse(raw) as GeneratedPlayer[];

    const outfieldPlayer = players.find((player) => player.position !== 'GK');
    const goalkeeper = players.find((player) => player.position === 'GK');

    expect(outfieldPlayer?.stats.vision).toBeGreaterThan(0);
    expect(outfieldPlayer?.stats.composure).toBeGreaterThan(0);
    expect(outfieldPlayer?.stats.tackling).toBeGreaterThan(0);
    expect(outfieldPlayer?.stats.positioning).toBeGreaterThan(0);
    expect(outfieldPlayer?.stats.crossing).toBeGreaterThan(0);

    expect(goalkeeper?.stats.shotStopping).toBeGreaterThan(0);
    expect(goalkeeper?.stats.commandOfArea).toBeGreaterThan(0);
  });

  it('keeps the known age overrides applied in the generated dataset', () => {
    const datasetPath = path.join(process.cwd(), 'public', 'data', 'players.json');
    const raw = fs.readFileSync(datasetPath, 'utf8');
    const players = JSON.parse(raw) as GeneratedPlayer[];

    expect(players.find((player) => player.name === 'Yael Trepy')?.age).toBe(19);
    expect(players.find((player) => player.name === 'Cheveyo Muy')?.age).toBe(19);
    expect(players.find((player) => player.name === 'Andrés Antañón')?.age).toBe(19);
  });
});
