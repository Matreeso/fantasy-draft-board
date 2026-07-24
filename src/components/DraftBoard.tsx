"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

import { PlayerList } from "@/components/PlayerList";
import {
    createClient,
} from "@/lib/supabase/client";
import type {
  DraftPick,
  DraftTeam,
  Player,
  DraftMember,
} from "@/types/draft";

type PickRow = {
    id: number;
    draft_id: number;
    draft_team_id: number;
    player_id: number;
    pick_number: number;
    round_number: number;
    created_at: string;
};
  
type LoadPicksResponse = {
  picks?: PickRow[];
  error?: string;
  message?: string;
};

type DraftBoardProps = {
    draftId: number;
    initialPlayers: Player[];
    initialPicks?: DraftPick[];
    initialTeams?: DraftTeam[];
    teamCount?: number;
    currentMember: DraftMember;
};

type UndoPickResponse = {
    pick?: {
      id: number;
      draft_id: number;
      draft_team_id: number;
      player_id: number;
      pick_number: number;
      round_number: number;
      created_at: string;
    };
    error?: string;
    message?: string;
};

type CreatePickResponse = {
  pick?: {
    id: number;
    draft_id: number;
    draft_team_id: number;
    player_id: number;
    pick_number: number;
    round_number: number;
    created_at: string;
  };
  error?: string;
  message?: string;
};

export function DraftBoard({
  draftId,
  initialPlayers,
  initialPicks = [],
  initialTeams = [],
  teamCount = 4,
  currentMember,
}: DraftBoardProps) {
    const supabase = useMemo(
        () => createClient(),
        [],
      );
  const [picks, setPicks] =
    useState<DraftPick[]>(initialPicks);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

    const [realtimeStatus, setRealtimeStatus] =
    useState("CONNECTING");

    const [isUndoing, setIsUndoing] = useState(false);

  /*
   * If real teams were loaded from Supabase, use them.
   * Otherwise, create temporary Team 1, Team 2, etc. objects.
   */
  const teams = useMemo<DraftTeam[]>(() => {
    if (initialTeams.length > 0) {
      return [...initialTeams].sort(
        (firstTeam, secondTeam) =>
          firstTeam.draft_position -
          secondTeam.draft_position,
      );
    }

    return Array.from(
      { length: teamCount },
      (_, index) => ({
        id: index + 1,
        draft_id: draftId,
        name: `Team ${index + 1}`,
        draft_position: index + 1,
        created_at: "",
      }),
    );
  }, [draftId, initialTeams, teamCount]);

  const actualTeamCount = teams.length;

  const reloadPicks = useCallback(async () => {
  try {
    const response = await fetch(
      `/api/drafts/${draftId}/picks`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const result =
      (await response.json()) as LoadPicksResponse;

    if (!response.ok || !result.picks) {
      throw new Error(
        result.message ?? "Could not reload draft picks.",
      );
    }

    const completePicks: DraftPick[] = [];

    for (const pickRow of result.picks) {
      const player = initialPlayers.find(
        (candidate) =>
          candidate.id === pickRow.player_id,
      );

      const draftTeam = teams.find(
        (candidate) =>
          candidate.id === pickRow.draft_team_id,
      );

      if (!player || !draftTeam) {
        console.error(
          "Could not connect a pick to its player or team:",
          pickRow,
        );

        continue;
      }

      completePicks.push({
        ...pickRow,
        player,
        draftTeam,
      });
    }

    setPicks(completePicks);
    setErrorMessage(null);
  } catch (error) {
    console.error("Reload picks failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Could not reload draft picks.";

    setErrorMessage(message);
  }
    }, [draftId, initialPlayers, teams]);

  useEffect(() => {
    let reloadTimer: ReturnType<typeof setTimeout> | null =
      null;
  
    function scheduleReload() {
      /*
       * A transaction or rapid sequence of events could produce
       * several notifications close together.
       *
       * Waiting briefly combines them into one reload.
       */
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
  
      reloadTimer = setTimeout(() => {
        void reloadPicks();
      }, 100);
    }
  
    const channel = supabase
      .channel(`draft-${draftId}-picks`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "picks",
          filter: `draft_id=eq.${draftId}`,
        },
        (payload) => {
          console.log("Realtime picks event:", payload);
          scheduleReload();
        },
      )
      .subscribe((status, error) => {
        console.log(
          "Draft Realtime status:",
          status,
          error,
        );
  
        setRealtimeStatus(status);
  
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          console.error(
            "Draft Realtime subscription failed:",
            error,
          );
  
          setErrorMessage(
            "Live updates disconnected. Refreshing the page will still show saved picks.",
          );
        }
  
        if (status === "SUBSCRIBED") {
          /*
           * Reload once after connecting in case a change happened
           * between the initial page load and subscription startup.
           */
          void reloadPicks();
        }
      });
  
    return () => {
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
  
      void supabase.removeChannel(channel);
    };
  }, [draftId, reloadPicks]);

  /*
   * Find the highest existing pick number.
   *
   * Using picks.length + 1 usually works, but using the highest
   * pick number is safer if records are ever missing or reordered.
   */
  const nextPickNumber = useMemo(() => {
    if (picks.length === 0) {
      return 1;
    }

    const highestPickNumber = Math.max(
      ...picks.map((pick) => pick.pick_number),
    );

    return highestPickNumber + 1;
  }, [picks]);

  /*
   * Calculate the current round.
   *
   * With four teams:
   * Picks 1-4 are round 1.
   * Picks 5-8 are round 2.
   */
  const currentRoundNumber = Math.ceil(
    nextPickNumber / actualTeamCount,
  );

  /*
   * This is the zero-based position inside the round.
   *
   * For four teams, the values repeat:
   * 0, 1, 2, 3
   */
  const positionInsideRound =
    (nextPickNumber - 1) % actualTeamCount;

  /*
   * Even rounds move backward in a snake draft.
   */
  const isReverseRound =
    currentRoundNumber % 2 === 0;

  /*
   * Snake-order examples with four teams:
   *
   * Round 1: 1, 2, 3, 4
   * Round 2: 4, 3, 2, 1
   */
  const currentDraftPosition = isReverseRound
    ? actualTeamCount - positionInsideRound
    : positionInsideRound + 1;

  const currentTeam = teams.find(
    (team) =>
      team.draft_position === currentDraftPosition,
  );

  const isCommissioner =
  currentMember.role === "commissioner";

const isSpectator =
  currentMember.role === "spectator";

const ownsCurrentTeam =
  currentMember.role === "team_owner" &&
  currentMember.draft_team_id === currentTeam?.id;

const canDraft =
  isCommissioner || ownsCurrentTeam;

  /*
   * Remove drafted players from the available-player list.
   */
  const availablePlayers = useMemo(() => {
    const draftedPlayerIds = new Set(
      picks.map((pick) => pick.player_id),
    );

    return initialPlayers.filter(
      (player) => !draftedPlayerIds.has(player.id),
    );
  }, [initialPlayers, picks]);

  async function draftPlayer(player: Player) {
    if (isSubmitting) {
      return;
    }

    if (!currentTeam) {
      setErrorMessage(
        "The team for the current pick could not be found.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        `/api/drafts/${draftId}/picks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            playerId: player.id,
          }),
        },
      );

      const result =
        (await response.json()) as CreatePickResponse;

      if (!response.ok || !result.pick) {
        throw new Error(
          result.message ?? "Could not save the pick.",
        );
      }

      /*
       * The API returns the saved database fields.
       *
       * We already have the complete player and team objects,
       * so we combine them into one DraftPick for the interface.
       */
      await reloadPicks();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not save the pick.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function undoLastPick() {
    if (isUndoing || isSubmitting || picks.length === 0) {
      return;
    }
  
    setIsUndoing(true);
    setErrorMessage(null);
  
    try {
      const response = await fetch(
        `/api/drafts/${draftId}/picks`,
        {
          method: "DELETE",
        },
      );
  
      const result =
        (await response.json()) as UndoPickResponse;
  
      if (!response.ok || !result.pick) {
        throw new Error(
          result.message ?? "Could not undo the last pick.",
        );
      }
  
      await reloadPicks();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Could not undo the last pick.";
  
      setErrorMessage(message);
    } finally {
      setIsUndoing(false);
    }
  }

  return (
    <div>
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                realtimeStatus === "SUBSCRIBED"
                  ? "bg-green-400"
                  : "bg-yellow-400"
              }`}
            />

            <span className="text-slate-400">
              {realtimeStatus === "SUBSCRIBED"
                ? "Live updates connected"
                : "Connecting to live updates"}
            </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold">
            Fantasy Draft Board
          </h1>

          <p className="mt-2 text-slate-400">
            Pick {nextPickNumber} · Round{" "}
            {currentRoundNumber}
          </p>

          <p className="mt-1 text-lg font-semibold text-yellow-300">
            {currentTeam
              ? `${currentTeam.name} is on the clock`
              : "Current team unavailable"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
        {isCommissioner && (
        <button
            type="button"
            onClick={undoLastPick}
            disabled={
              picks.length === 0 ||
              isUndoing ||
              isSubmitting
            }
            className="rounded-lg border border-slate-600 px-4 py-2 font-semibold disabled:opacity-40"
            >
            {isUndoing
              ? "Undoing..."
              : "Undo Last Pick"}
        </button>
        )}

            <form action="/logout" method="post">
                <button
                  type="submit"
                  className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold"
                >
                  Log out
                </button>
            </form>
          
            <div className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
              <p className="text-sm text-slate-400">
                Completed picks
              </p>
          
              <p className="text-2xl font-bold">
                {picks.length}
              </p>
            </div>
        </div>
      </header>

      {errorMessage && (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-red-700 bg-red-950/50 p-4 text-red-200"
        >
          <p>{errorMessage}</p>

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="shrink-0 font-semibold hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-2xl font-bold">
          Draft Board
        </h2>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-max gap-4 pb-4">
            {teams.map((team) => {
              const teamPicks = picks
                .filter(
                  (pick) =>
                    pick.draft_team_id === team.id ||
                    pick.draftTeam.draft_position ===
                      team.draft_position,
                )
                .sort(
                  (firstPick, secondPick) =>
                    firstPick.pick_number -
                    secondPick.pick_number,
                );

              const isCurrentTeam =
                currentTeam?.draft_position ===
                team.draft_position;

              return (
                <article
                  key={team.id}
                  className={`w-64 rounded-xl border p-4 ${
                    isCurrentTeam
                      ? "border-yellow-400 bg-yellow-950/30"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-400">
                        Draft position{" "}
                        {team.draft_position}
                      </p>

                      <h3 className="font-bold">
                        {team.name}
                      </h3>
                    </div>

                    {isCurrentTeam && (
                      <span className="rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-black">
                        On the clock
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {teamPicks.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-700 p-3 text-sm text-slate-500">
                        No picks yet
                      </p>
                    ) : (
                      teamPicks.map((pick) => (
                        <div
                          key={pick.id}
                          className="rounded-lg bg-slate-800 p-3"
                        >
                          <p className="text-xs text-slate-400">
                            Pick {pick.pick_number} · Round{" "}
                            {pick.round_number}
                          </p>

                          <p className="mt-1 font-semibold">
                            {pick.player.name}
                          </p>

                          <p className="text-sm text-slate-400">
                            {pick.player.position}
                            {pick.player.nfl_team
                              ? ` · ${pick.player.nfl_team}`
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section>
          <h2 className="text-2xl font-bold">
            Recent Picks
          </h2>

          {picks.length === 0 ? (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-6">
              <p className="text-slate-400">
                No players have been drafted yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {[...picks]
                .sort(
                  (firstPick, secondPick) =>
                    secondPick.pick_number -
                    firstPick.pick_number,
                )
                .slice(0, 10)
                .map((pick) => (
                  <article
                    key={pick.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4"
                  >
                    <div>
                      <p className="text-xs text-slate-400">
                        Pick {pick.pick_number} ·{" "}
                        {pick.draftTeam.name}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        {pick.player.name}
                      </h3>

                      <p className="text-sm text-slate-400">
                        {pick.player.position}
                        {pick.player.nfl_team
                          ? ` · ${pick.player.nfl_team}`
                          : ""}
                      </p>
                    </div>

                    <span className="rounded bg-slate-800 px-3 py-1 text-sm text-slate-300">
                      Round {pick.round_number}
                    </span>
                  </article>
                ))}
            </div>
          )}
        </section>

        <PlayerList
          players={availablePlayers}
          onDraftPlayer={draftPlayer}
          isDrafting={isSubmitting}
          canDraft={canDraft}
        />
      </div>
    </div>
  );
}