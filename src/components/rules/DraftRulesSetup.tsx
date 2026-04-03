import { useMemo, useState } from 'react';
import { applyDraftRules, type DraftRules } from '../../lib/game/rules';
import {
  formatLeagueLabel,
  formatPlayerCount,
  getNationalityLabel,
} from '../../lib/players/formatters';
import type { Player } from '../../types/player';

type DraftRulesSetupProps = {
  players: Player[];
  isReady: boolean;
  onStart: (rules: DraftRules) => void;
  onQuickStart: () => void;
};

const MAX_TEAM_VALUE_OPTIONS = [250, 300, 350, 400];

export function DraftRulesSetup({
  players,
  isReady,
  onStart,
  onQuickStart,
}: DraftRulesSetupProps) {
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedNationality, setSelectedNationality] = useState('ALL');
  const [selectedMaxTeamValue, setSelectedMaxTeamValue] = useState('ALL');

  const leagueOptions = useMemo(
    () => [...new Set(players.map((player) => player.league))].sort((a, b) => a.localeCompare(b)),
    [players],
  );
  const nationalityOptions = useMemo(
    () =>
      [...new Set(players.map((player) => player.nationality))].sort((a, b) => a.localeCompare(b)),
    [players],
  );

  const currentRules: DraftRules = {
    league: selectedLeague === 'ALL' ? null : selectedLeague,
    nationality: selectedNationality === 'ALL' ? null : selectedNationality,
    maxTeamValue: selectedMaxTeamValue === 'ALL' ? null : Number(selectedMaxTeamValue),
  };

  const matchingPlayers = useMemo(
    () => applyDraftRules(players, currentRules),
    [players, currentRules],
  );

  const canStart = isReady && matchingPlayers.length >= 10;

  return (
    <section className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
      <h2 className="text-3xl font-semibold text-white">Choix des règles</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
        Limite la draft à un championnat, une nationalité ou un budget maximum pour chaque
        équipe. Tu peux aussi lancer une draft rapide sans restriction.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Championnat
          </span>
          <select
            value={selectedLeague}
            onChange={(event) => setSelectedLeague(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">Tous</option>
            {leagueOptions.map((league) => (
              <option key={league} value={league}>
                {formatLeagueLabel(league)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Nationalité
          </span>
          <select
            value={selectedNationality}
            onChange={(event) => setSelectedNationality(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">Toutes</option>
            {nationalityOptions.map((nationality) => (
              <option key={nationality} value={nationality}>
                {getNationalityLabel(nationality)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
            Valeur max par équipe
          </span>
          <select
            value={selectedMaxTeamValue}
            onChange={(event) => setSelectedMaxTeamValue(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
          >
            <option value="ALL">Aucune limite</option>
            {MAX_TEAM_VALUE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} MEUR
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <p className="text-sm font-semibold text-white">Aperçu des règles</p>
        <p className="mt-2 text-sm text-slate-300">
          {formatPlayerCount(matchingPlayers.length)} correspondent à ces critères.
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Il faut au moins 10 joueurs dans le pool pour lancer une draft 5 vs 5.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onStart(currentRules)}
          disabled={!canStart}
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Lancer avec ces règles
        </button>
        <button
          type="button"
          onClick={onQuickStart}
          disabled={!isReady}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Démarrage rapide sans restriction
        </button>
      </div>
    </section>
  );
}
