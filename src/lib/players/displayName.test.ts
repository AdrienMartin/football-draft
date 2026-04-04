import { describe, expect, it } from 'vitest';
import { getDisplayLastName } from './displayName';

describe('getDisplayLastName', () => {
  it('keeps simple last names readable', () => {
    expect(getDisplayLastName('Lionel Messi')).toBe('Messi');
    expect(getDisplayLastName('Pelé')).toBe('Pelé');
  });

  it('keeps common surname prefixes attached', () => {
    expect(getDisplayLastName('Kevin De Bruyne')).toBe('De Bruyne');
    expect(getDisplayLastName('Virgil van Dijk')).toBe('van Dijk');
    expect(getDisplayLastName('Ludwig van Beethoven')).toBe('van Beethoven');
  });

  it('falls back to the trailing surname when there is no known prefix', () => {
    expect(getDisplayLastName('João Félix')).toBe('Félix');
    expect(getDisplayLastName('Lautaro Martínez')).toBe('Martínez');
  });
});
