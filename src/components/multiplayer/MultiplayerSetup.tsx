import { useMemo, useState, type ReactNode } from 'react';
import { applyDraftRules, type DraftRules } from '../../lib/game/rules';
import { isPlayerConnectionStale } from '../../lib/multiplayer/rooms';
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

async function copyTextWithFallback(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const success = document.execCommand('copy');
  document.body.removeChild(textArea);

  if (!success) {
    throw new Error('copy-failed');
  }
}

function formatRulesSummary(rules: DraftRules) {
  const parts = [
    rules.league ?? 'Tous les championnats',
    rules.nationality ?? 'Toutes les nationalités',
    rules.maxTeamValue ? `${rules.maxTeamValue} MEUR max` : 'Sans budget max',
  ];

  return parts.join(' · ');
}

function PlayerStatusCard({
  label,
  name,
  connectedAt,
  tone,
}: {
  label: string;
  name: string | null;
  connectedAt: string | null;
  tone: 'emerald' | 'sky';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-400/20 bg-emerald-400/10'
      : 'border-sky-400/20 bg-sky-400/10';

  const statusLabel = !name
    ? 'Pas encore rejoint'
    : isPlayerConnectionStale(connectedAt)
      ? 'Reconnexion...'
      : 'Connecté';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{name ?? 'En attente'}</p>
      <p className="mt-1 text-sm text-slate-300">{statusLabel}</p>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: 'warning' | 'danger';
  children: ReactNode;
}) {
  const classes =
    tone === 'warning'
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-100'
      : 'border-red-400/30 bg-red-400/10 text-red-100';

  return <div className={`rounded-2xl border px-4 py-4 text-sm ${classes}`}>{children}</div>;
}

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
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const isGuestFlow = setup.localSlot === 'guest' && Boolean(setup.roomId);
  const roomLoaded = Boolean(setup.room);
  const waitingForGuest = roomLoaded && !setup.room?.guestName;
  const bothPlayersPresent = Boolean(setup.room?.hostName && setup.room?.guestName);
  const canHostStartDraft =
    setup.localSlot === 'host' &&
    bothPlayersPresent &&
    !setup.opponentDisconnected &&
    (setup.room?.status === 'ready' || setup.room?.status === 'waiting');

  const leagueOptions = useMemo(
    () => [...new Set(players.map((player) => player.league))].sort((a, b) => a.localeCompare(b)),
    [players],
  );
  const nationalityOptions = useMemo(
    () =>
      [...new Set(players.map((player) => player.nationality))].sort((a, b) =>
        a.localeCompare(b),
      ),
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

    try {
      await copyTextWithFallback(setup.inviteLink);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }

    window.setTimeout(() => setCopyState('idle'), 1800);
  }

  if (roomLoaded && isGuestFlow && !setup.room?.guestName) {
    return (
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 md:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/80">
            Duel 1v1
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
            Rejoindre la room
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Entre ton pseudo pour rejoindre la partie créée par{' '}
            {setup.room?.hostName ?? 'le host'}.
          </p>
        </div>

        {setup.connectionIssue && <div className="mt-6"><Notice tone="warning">{setup.connectionIssue}</Notice></div>}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PlayerStatusCard
            label="Host"
            name={setup.room?.hostName ?? null}
            connectedAt={setup.room?.hostConnectedAt ?? null}
            tone="emerald"
          />
          <PlayerStatusCard label="Guest" name={null} connectedAt={null} tone="sky" />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Règles de la draft</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {setup.room ? formatRulesSummary(setup.room.rules) : ''}
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-sm font-medium text-white">Ton pseudo</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
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
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto sm:min-w-[180px]"
            >
              {setup.isJoining ? 'Connexion...' : 'Rejoindre la room'}
            </button>
          </div>
        </div>

        {setup.error && <div className="mt-6"><Notice tone="danger">{setup.error}</Notice></div>}

        <div className="mt-8">
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Retour
          </button>
        </div>
      </section>
    );
  }

  if (roomLoaded) {
    return (
      <section className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 md:p-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/80">
              Duel 1v1
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Room prête à démarrer
            </h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Statut</p>
            <p className="mt-2 font-semibold text-white">
              {bothPlayersPresent ? 'Deux joueurs connectés' : 'En attente du second joueur'}
            </p>
          </div>
        </div>

        {setup.connectionIssue && <div className="mt-6"><Notice tone="warning">{setup.connectionIssue}</Notice></div>}

        {setup.opponentDisconnected && (
          <div className="mt-4">
            <Notice tone="danger">
              Le joueur adverse semble déconnecté. La room pourra reprendre automatiquement s il
              revient.
            </Notice>
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <PlayerStatusCard
            label="Host"
            name={setup.room?.hostName ?? null}
            connectedAt={setup.room?.hostConnectedAt ?? null}
            tone="emerald"
          />
          <PlayerStatusCard
            label="Guest"
            name={setup.room?.guestName ?? null}
            connectedAt={setup.room?.guestConnectedAt ?? null}
            tone="sky"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Règles de la draft</p>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {setup.room ? formatRulesSummary(setup.room.rules) : ''}
          </p>
        </div>

        {setup.inviteLink && waitingForGuest && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-sky-400/10 to-emerald-400/10 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Inviter un joueur</p>
                <p className="mt-1 text-sm text-slate-300">
                  Envoie ce lien à ton adversaire pour qu il rejoigne la room.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 sm:w-auto"
              >
                {copyState === 'copied'
                  ? 'Lien copié'
                  : copyState === 'failed'
                    ? 'Copie impossible'
                    : 'Copier le lien'}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
              <span className="break-all">{setup.inviteLink}</span>
            </div>

            {copyState === 'failed' && (
              <p className="mt-2 text-xs text-amber-200">
                La copie automatique a échoué. Tu peux copier le lien manuellement.
              </p>
            )}
          </div>
        )}

        {setup.error && <div className="mt-6"><Notice tone="danger">{setup.error}</Notice></div>}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {canHostStartDraft && (
            <button
              type="button"
              onClick={() => void onStartDraft()}
              className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 sm:w-auto"
            >
              Lancer la draft
            </button>
          )}
          <button
            type="button"
            onClick={onBack}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
          >
            Retour
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-8 md:p-10">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-200/80">
          Duel 1v1
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          Créer une draft 1v1
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Choisis les règles, crée la room, puis partage le lien d invitation à ton adversaire.
        </p>
      </div>

      {setup.connectionIssue && <div className="mt-6"><Notice tone="warning">{setup.connectionIssue}</Notice></div>}

      <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm text-slate-300">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Championnat
            </span>
            <select
              value={selectedLeague}
              onChange={(event) => setSelectedLeague(event.target.value)}
              className="h-[50px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none"
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
              className="h-[50px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none"
            >
              <option value="ALL">Toutes</option>
              {nationalityOptions.map((nationality) => (
                <option key={nationality} value={nationality}>
                  {nationality}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-300 md:col-span-2 xl:col-span-1">
            <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-400">
              Valeur max par équipe
            </span>
            <select
              value={selectedMaxTeamValue}
              onChange={(event) => setSelectedMaxTeamValue(event.target.value)}
              className="h-[50px] w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm text-white outline-none"
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

        {!isSupabaseConfigured && (
          <Notice tone="warning">
            Supabase n est pas configuré. Ajoute les variables d environnement avant de créer une
            room.
          </Notice>
        )}

        {setup.error && <Notice tone="danger">{setup.error}</Notice>}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void onCreateRoom(currentRules)}
          disabled={
            !isSupabaseConfigured ||
            !setup.hostName.trim() ||
            matchingPlayers.length < 10 ||
            setup.isCreating
          }
          className="w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 sm:w-auto"
        >
          {setup.isCreating ? 'Création en cours...' : 'Créer la room'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
        >
          Retour
        </button>
      </div>
    </section>
  );
}
