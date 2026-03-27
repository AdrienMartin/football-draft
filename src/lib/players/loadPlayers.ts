import type { Player } from '../../types/player';

export async function loadPlayers(): Promise<Player[]> {
  const response = await fetch('/data/players.json');

  if (!response.ok) {
    throw new Error('Impossible de charger les joueurs.');
  }

  return (await response.json()) as Player[];
}
