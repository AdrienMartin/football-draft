export const APP_STEPS = [
  'landing',
  'rules',
  'draft',
  'match',
  'result',
] as const;

export type AppStep = (typeof APP_STEPS)[number];
