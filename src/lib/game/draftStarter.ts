import type { DraftTurn } from './draft';

type DraftStarterPresentation = {
  lead: string;
  headline: string;
  subline: string;
  userFace: string;
  aiFace: string;
};

type DraftAutoPickState = {
  mode: 'solo' | 'multiplayer';
  currentTurn: DraftTurn;
  draftComplete: boolean;
  loading: boolean;
  error: string | null;
  showDraftStarterBanner: boolean;
};

export function getDraftStarterPresentation(
  draftStarter: DraftTurn,
  showOutcomeText: boolean,
): DraftStarterPresentation {
  if (!showOutcomeText) {
    return {
      lead: 'Pile ou face',
      headline: 'Pile ou face...',
      subline: 'On determine qui ouvre la draft.',
      userFace: '?',
      aiFace: '?',
    };
  }

  return {
    lead: 'Resultat',
    headline: draftStarter === 'user' ? 'Tu commences' : 'L adversaire commence',
    subline:
      draftStarter === 'user'
        ? 'Tu as le premier choix.'
        : 'Le premier choix pour l adversaire.',
    userFace: 'TOI',
    aiFace: 'IA',
  };
}

export function shouldAutoPickAiDraft(state: DraftAutoPickState) {
  return !(
    state.mode === 'multiplayer' ||
    state.currentTurn !== 'ai' ||
    state.draftComplete ||
    state.loading ||
    state.error ||
    state.showDraftStarterBanner
  );
}

export function canUserPickDuringDraft(
  currentTurn: DraftTurn,
  draftComplete: boolean,
  showDraftStarterBanner: boolean,
) {
  return !draftComplete && currentTurn === 'user' && !showDraftStarterBanner;
}
