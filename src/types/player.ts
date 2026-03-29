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
  goalkeeping?: number;
  reflexes?: number;
  handling?: number;
  distribution?: number;
  aerial?: number;
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
  stats: PlayerStats;
};
