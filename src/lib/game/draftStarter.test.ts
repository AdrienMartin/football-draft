import { describe, expect, it } from 'vitest';
import {
  canUserPickDuringDraft,
  getDraftStarterPresentation,
  shouldAutoPickAiDraft,
} from './draftStarter';

describe('draft starter helpers', () => {
  it('keeps the result hidden during the coin flip animation', () => {
    expect(getDraftStarterPresentation('user', false)).toEqual({
      lead: 'Pile ou face',
      headline: 'Pile ou face...',
      subline: 'On determine qui ouvre la draft.',
      userFace: '?',
      aiFace: '?',
    });
  });

  it('reveals the proper winner once the animation is over', () => {
    expect(getDraftStarterPresentation('user', true)).toEqual({
      lead: 'Resultat',
      headline: 'Tu commences',
      subline: 'Tu as le premier choix.',
      userFace: 'TOI',
      aiFace: 'IA',
    });
    expect(getDraftStarterPresentation('ai', true)).toEqual({
      lead: 'Resultat',
      headline: 'L adversaire commence',
      subline: 'Le premier choix pour l adversaire.',
      userFace: 'TOI',
      aiFace: 'IA',
    });
  });

  it('blocks AI auto-pick while the coin flip modal is visible', () => {
    expect(
      shouldAutoPickAiDraft({
        mode: 'solo',
        currentTurn: 'ai',
        draftComplete: false,
        loading: false,
        error: null,
        showDraftStarterBanner: true,
      }),
    ).toBe(false);
  });

  it('allows AI auto-pick once the coin flip modal is gone', () => {
    expect(
      shouldAutoPickAiDraft({
        mode: 'solo',
        currentTurn: 'ai',
        draftComplete: false,
        loading: false,
        error: null,
        showDraftStarterBanner: false,
      }),
    ).toBe(true);
  });

  it('blocks user picks while the coin flip modal is visible', () => {
    expect(canUserPickDuringDraft('user', false, true)).toBe(false);
    expect(canUserPickDuringDraft('user', false, false)).toBe(true);
  });
});
