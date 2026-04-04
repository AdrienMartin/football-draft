const LAST_NAME_PREFIXES = new Set([
  'al',
  'bin',
  'da',
  'dal',
  'de',
  'dei',
  'del',
  'della',
  'der',
  'di',
  'dos',
  'du',
  'el',
  'la',
  'le',
  'st',
  'van',
  'von',
]);

export function getDisplayLastName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return fullName;
  }

  const lastParts = [parts[parts.length - 1]];
  let index = parts.length - 2;

  while (index >= 0) {
    const candidate = parts[index].toLowerCase();

    if (!LAST_NAME_PREFIXES.has(candidate)) {
      break;
    }

    lastParts.unshift(parts[index]);
    index -= 1;
  }

  return lastParts.join(' ');
}
