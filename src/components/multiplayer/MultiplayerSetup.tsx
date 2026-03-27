import { useMemo, useState } from 'react';
import { applyDraftRules, type DraftRules } from '../../lib/game/rules';
import { formatPlayerCount } from '../../lib/players/formatters';
import type { MultiplayerSetupState } from '../../lib/multiplayer/types';
import { isSupabaseConfigured } from '../../lib/supabase/client';
import type { Player } from '../../types/player';

type MultiplayerSetupProps = {
  players: Player[];
  setup: MultiplayerSetupState;
  onChangeHostName: (value: string) => void;
  onChangeGuestName: (value: string) => void;
  onCreateRoom: (rules: DraftRules) => Promise<void>;
  onJoinRoom: () => Promise<void>;
  onStartDraft: () => Promise<void>;
  onBack: () => void;
};

const MAX_TEAM_VALUE_OPTIONS = [250, 300, 350, 400];

export function MultiplayerSetup({
  players,
  setup,
  onChangeHostName,
  onChangeGuestName,
  onCreateRoom,
  onJoinRoom,
  onStartDraft,
  onBack,
}: MultiplayerSetupProps) {
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedNationality, setSelectedNationality] = useState('ALL');
  const [selectedMaxTeamValue, setSelectedMaxTeamValue] = useState('ALL');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  const isGuestFlow = setup.localSlot === 'guest' && Boolean(setup.roomId);
  const roomLoaded = Boolean(setup.room);
  const waitingForGuest = roomLoaded && !setup.room?.guestName;
  const bothPlayersPresent = Boolean(setup.room?.hostName && setup.room?.guestName);
  const canHostStartDraft =
    setup.localSlot === 'host' &&
    bothPlayersPresent &&
    (setup.room?.status === 'ready' || setup.room?.status === 'waiting');

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

  async function handleCopyLink() {
    if (!setup.inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(setup.inviteLink);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('idle'), 1500);
  }

  if (roomLoaded) {
    return (
      <section className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
        <h2 className="text-3xl font-semibold text-white">Room multijoueur</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          La room est prête. On attend maintenant que les deux joueurs soient présents pour passer à
          la draft synchronisée.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Room</p>
            <p className="mt-3 text-lg font-semibold text-white">{setup.room?.id}</p>
            <p className="mt-2 text-sm text-slate-300">
              Statut : {bothPlayersPresent ? '2 joueurs connectés' : 'En attente d’un joueur'}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Règles : {setup.room?.rules.league ?? 'Tous les championnats'} /{' '}
              {setup.room?.rules.nationality ?? 'Toutes nationalités'} /{' '}
              {setup.room?.rules.maxTeamValue
                ? `${setup.room.rules.maxTeamValue} MEUR`
                : 'Sans budget max'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Joueurs</p>
            <p className="mt-3 text-sm text-slate-300">
              Host :{' '}
              <span className="font-semibold text-white">{setup.room?.hostName ?? 'En attente'}</span>
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Guest :{' '}
              <span className="font-semibold text-white">
                {setup.room?.guestName ?? 'En attente'}
              </span>
            </p>

            {isGuestFlow && !setup.room?.guestName && (
              <div className="mt-4 space-y-3">
                <input
                  value={setup.guestName}
                  onChange={(event) => onChangeGuestName(event.target.value)}
                  placeholder="Ton nom de joueur"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => void onJoinRoom()}
                  disabled={setup.isJoining || setup.guestName.trim().length === 0}
                  className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {setup.isJoining ? 'Connexion...' : 'Rejoindre la room'}
                </button>
              </div>
            )}

            {setup.inviteLink && waitingForGuest && (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Lien d’invitation
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    readOnly
                    value={setup.inviteLink}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                  >
                    {copyState === 'copied' ? 'Lien copié' : 'Copier le lien'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {setup.error && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-4 text-sm text-red-100">
            {setup.error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {canHostStartDraft && (
            <button
              type="button"
              onClick={() => void onStartDraft()}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Lancer la draft
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Retour
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-10">
      <h2 className="text-3xl font-semibold text-white">Créer une draft 1v1</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
        Le host choisit les règles, crée une room, puis partage le lien d’invitation avec l’autre
        joueur. Quand le second joueur rejoint, on pourra lancer la draft.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <label className="text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Nom du host
            </span>
            <input
              value={setup.hostName}
              onChange={(event) => onChangeHostName(event.target.value)}
              placeholder="Exemple : Adrien"
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
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
                    {league}
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
                    {nationality}
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

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Aperçu des règles</p>
            <p className="mt-2">
              {formatPlayerCount(matchingPlayers.length)} correspondent à ces critères.
            </p>
            <p className="mt-2 text-slate-400">
              Il faut au moins 10 joueurs dans le pool pour lancer une draft 5 vs 5.
            </p>
          </div>

          {setup.error && (
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-4 text-sm text-red-100">
              {setup.error}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">État Supabase</p>
            <p className="mt-3 text-lg font-semibold text-white">
              {isSupabaseConfigured ? 'Configuration détectée' : 'Variables manquantes'}
            </p>
            <p className="mt-3 text-sm text-slate-300">
              {isSupabaseConfigured
                ? 'La création de room est prête. On peut maintenant ouvrir une room via le lien et la rejoindre.'
                : 'Ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour activer la création de room.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Table attendue</p>
            <p className="mt-2 text-slate-400">
              Exécute le SQL dans <span className="font-mono">supabase/multiplayer_rooms.sql</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onCreateRoom(currentRules)}
          disabled={
            !isSupabaseConfigured ||
            !setup.hostName.trim() ||
            matchingPlayers.length < 10 ||
            setup.isCreating
          }
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {setup.isCreating ? 'Création en cours...' : 'Créer la room'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Retour
        </button>
      </div>
    </section>
  );
}
