import { useEffect, useState } from 'react';
import { DraftAvailablePlayers } from '../components/draft/DraftAvailablePlayers';
import { DraftStatus } from '../components/draft/DraftStatus';
import { DraftTeamPanel } from '../components/draft/DraftTeamPanel';
import { LandingPage } from '../components/landing/LandingPage';
import { MatchPreview } from '../components/match/MatchPreview';
import { MatchResultCard } from '../components/match/MatchResultCard';
import { DraftRulesSetup } from '../components/rules/DraftRulesSetup';
import {
  canDraftPlayer,
  getMissingRequiredRoles,
  getPlayerRole,
  type PlayerRole,
} from '../lib/game/draft';
import { loadPlayers } from '../lib/players/loadPlayers';
import type { DraftRules } from '../lib/game/rules';
import { useGameStore } from '../store/useGameStore';

type SortOption = 'rating-desc' | 'name-asc' | 'name-desc';

export function HomePage() {
  const PLAYERS_PER_PAGE = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ALL' | PlayerRole>('ALL');
  const [selectedNationality, setSelectedNationality] = useState('ALL');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('rating-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const availablePlayers = useGameStore((state) => state.availablePlayers);
  const userTeam = useGameStore((state) => state.userTeam);
  const aiTeam = useGameStore((state) => state.aiTeam);
  const currentTurn = useGameStore((state) => state.currentTurn);
  const draftComplete = useGameStore((state) => state.draftComplete);
  const lastPick = useGameStore((state) => state.lastPick);
  const draftMessage = useGameStore((state) => state.draftMessage);
  const currentStep = useGameStore((state) => state.currentStep);
  const rules = useGameStore((state) => state.rules);
  const initialPlayers = useGameStore((state) => state.initialPlayers);
  const matchResult = useGameStore((state) => state.matchResult);
  const loadInitialPlayers = useGameStore((state) => state.loadPlayers);
  const openRules = useGameStore((state) => state.openRules);
  const startQuickDraft = useGameStore((state) => state.startQuickDraft);
  const startDraft = useGameStore((state) => state.startDraft);
  const userPickPlayer = useGameStore((state) => state.userPickPlayer);
  const aiPickTurn = useGameStore((state) => state.aiPickTurn);
  const playMatch = useGameStore((state) => state.playMatch);
  const replayMatch = useGameStore((state) => state.replayMatch);
  const resetDraft = useGameStore((state) => state.resetDraft);

  const requiredRoles = getMissingRequiredRoles(userTeam);
  const eligiblePlayers = availablePlayers.filter((player) =>
    canDraftPlayer(userTeam, player, rules.maxTeamValue),
  );
  const availableRoleFilters: Array<'ALL' | PlayerRole> = [
    'ALL',
    ...(['GK', 'DEF', 'MID', 'FWD'] as PlayerRole[]).filter((role) =>
      eligiblePlayers.some((player) => getPlayerRole(player.position) === role),
    ),
  ];
  const nationalityOptions = [...new Set(eligiblePlayers.map((player) => player.nationality))].sort(
    (a, b) => a.localeCompare(b),
  );
  const leagueOptions = [...new Set(eligiblePlayers.map((player) => player.league))].sort((a, b) =>
    a.localeCompare(b),
  );

  const roleFilteredPlayers =
    selectedRole === 'ALL'
      ? eligiblePlayers
      : eligiblePlayers.filter((player) => getPlayerRole(player.position) === selectedRole);
  const nationalityFilteredPlayers =
    selectedNationality === 'ALL'
      ? roleFilteredPlayers
      : roleFilteredPlayers.filter((player) => player.nationality === selectedNationality);
  const leagueFilteredPlayers =
    selectedLeague === 'ALL'
      ? nationalityFilteredPlayers
      : nationalityFilteredPlayers.filter((player) => player.league === selectedLeague);

  const sortedPlayers = [...leagueFilteredPlayers].sort((left, right) => {
    if (sortOption === 'name-asc') {
      return left.name.localeCompare(right.name);
    }

    if (sortOption === 'name-desc') {
      return right.name.localeCompare(left.name);
    }

    if (right.rating !== left.rating) {
      return right.rating - left.rating;
    }

    return left.name.localeCompare(right.name);
  });

  const totalPages = Math.max(1, Math.ceil(sortedPlayers.length / PLAYERS_PER_PAGE));
  const paginatedPlayers = sortedPlayers.slice(
    (currentPage - 1) * PLAYERS_PER_PAGE,
    currentPage * PLAYERS_PER_PAGE,
  );

  useEffect(() => {
    if (selectedRole !== 'ALL' && !availableRoleFilters.includes(selectedRole)) {
      setSelectedRole('ALL');
    }
  }, [availableRoleFilters, selectedRole]);

  useEffect(() => {
    if (selectedNationality !== 'ALL' && !nationalityOptions.includes(selectedNationality)) {
      setSelectedNationality('ALL');
    }
  }, [nationalityOptions, selectedNationality]);

  useEffect(() => {
    if (selectedLeague !== 'ALL' && !leagueOptions.includes(selectedLeague)) {
      setSelectedLeague('ALL');
    }
  }, [leagueOptions, selectedLeague]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRole, selectedNationality, selectedLeague, sortOption, sortedPlayers.length]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const data = await loadPlayers();
        loadInitialPlayers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    }

    void fetchPlayers();
  }, [loadInitialPlayers]);

  useEffect(() => {
    if (currentTurn !== 'ai' || draftComplete || loading || error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      aiPickTurn();
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [aiPickTurn, currentTurn, draftComplete, error, loading]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-6 text-sm text-red-100">
        {error}
      </div>
    );
  }

  if (currentStep === 'landing') {
    return (
      <LandingPage
        onOpenRules={openRules}
        onQuickStart={startQuickDraft}
        isReady={!loading && !error}
      />
    );
  }

  if (currentStep === 'rules') {
    return (
      <DraftRulesSetup
        players={initialPlayers}
        isReady={!loading && !error}
        onStart={(draftRules: DraftRules) => startDraft(draftRules)}
        onQuickStart={startQuickDraft}
      />
    );
  }

  if (currentStep === 'draft') {
    return (
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-6">
          <DraftStatus
            currentTurn={currentTurn}
            isComplete={draftComplete}
            lastPick={lastPick}
          />

          {draftMessage && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
              {draftMessage}
            </div>
          )}

          <DraftAvailablePlayers
            players={availablePlayers}
            filteredPlayers={paginatedPlayers}
            totalFilteredPlayers={sortedPlayers.length}
            currentPage={currentPage}
            totalPages={totalPages}
            onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
            onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            availableRoleFilters={availableRoleFilters}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            nationalityOptions={nationalityOptions}
            selectedNationality={selectedNationality}
            onSelectNationality={setSelectedNationality}
            leagueOptions={leagueOptions}
            selectedLeague={selectedLeague}
            onSelectLeague={setSelectedLeague}
            sortOption={sortOption}
            onSelectSort={setSortOption}
            requiredRoles={requiredRoles}
            maxTeamValue={rules.maxTeamValue}
            currentTeamValue={userTeam.reduce((sum, player) => sum + player.value, 0)}
            canPick={!draftComplete && currentTurn === 'user'}
            onPick={userPickPlayer}
          />
        </div>

        <aside className="space-y-6">
          <DraftTeamPanel
            title="Ton équipe"
            players={userTeam}
            accentClassName="bg-emerald-400/15 text-emerald-200"
          />

          <DraftTeamPanel
            title="Équipe IA"
            players={aiTeam}
            accentClassName="bg-sky-400/15 text-sky-100"
          />
        </aside>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {currentStep === 'match' && (
        <MatchPreview
          userTeam={userTeam}
          aiTeam={aiTeam}
          onPlay={playMatch}
          onResetDraft={resetDraft}
        />
      )}

      {currentStep === 'result' && matchResult && (
        <MatchResultCard
          result={matchResult}
          userTeam={userTeam}
          aiTeam={aiTeam}
          onReplay={replayMatch}
          onResetDraft={resetDraft}
        />
      )}
    </section>
  );
}
