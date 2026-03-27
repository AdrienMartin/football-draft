export const APP_STEPS = [
  'landing',
  'multiplayer',
  'rules',
  'draft',
  'match',
  'result',
] as const;

export type AppStep = (typeof APP_STEPS)[number];
