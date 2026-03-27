const nationalityToFlagCode: Record<string, string> = {
  ARG: 'ar',
  Argentina: 'ar',
  AUS: 'au',
  Australia: 'au',
  BEL: 'be',
  Belgium: 'be',
  BRA: 'br',
  Brazil: 'br',
  CAN: 'ca',
  Canada: 'ca',
  EGY: 'eg',
  Egypt: 'eg',
  ENG: 'gb-eng',
  England: 'gb-eng',
  ESP: 'es',
  Spain: 'es',
  FRA: 'fr',
  France: 'fr',
  GER: 'de',
  Germany: 'de',
  ITA: 'it',
  Italy: 'it',
  KVX: 'xk',
  Kosovo: 'xk',
  MAR: 'ma',
  Morocco: 'ma',
  NED: 'nl',
  Netherlands: 'nl',
  NGA: 'ng',
  Nigeria: 'ng',
  NOR: 'no',
  Norway: 'no',
  POR: 'pt',
  Portugal: 'pt',
  SCO: 'gb-sct',
  Scotland: 'gb-sct',
  SEN: 'sn',
  Senegal: 'sn',
  SVK: 'sk',
  SVKc: 'sk',
  Slovakia: 'sk',
  URU: 'uy',
  Uruguay: 'uy',
  USA: 'us',
};

export function getNationalityLabel(nationality: string) {
  return nationality;
}

export function getNationalityFlagCode(nationality: string) {
  return nationalityToFlagCode[nationality] ?? null;
}

export function formatTeamValue(totalValue: number) {
  return `${totalValue} MEUR`;
}

export function formatPlayerCount(count: number) {
  return `${count} joueur${count > 1 ? 's' : ''}`;
}
