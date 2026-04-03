export type PlayerPosition =
  | 'GK'
  | 'RB'
  | 'LB'
  | 'CB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'RW'
  | 'LW'
  | 'CF'
  | 'ST';

export type PlayerStats = {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  vision: number;
  composure: number;
  tackling: number;
  positioning: number;
  crossing: number;
  goalkeeping?: number;
  reflexes?: number;
  handling?: number;
  distribution?: number;
  aerial?: number;
  shotStopping?: number;
  commandOfArea?: number;
};

export type Player = {
  id: number;
  name: string;
  nationality: string;
  club: string;
  league: string;
  age: number;
  position: PlayerPosition;
  rating: number;
  value: number;
  marketValueEur?: number;
  transfermarktUrl?: string | null;
  photoUrl?: string | null;
  stats: PlayerStats;
};
