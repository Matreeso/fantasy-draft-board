"use client";

import { useMemo, useState } from "react";

import { PlayerList } from "@/components/PlayerList";
import { TeamColumn } from "@/components/TeamColumn";
import type { DraftPick, Player } from "@/types/draft";

type DraftBoardProps = {
  initialPlayers: Player[];
};

const TEAM_COUNT = 4;

export function DraftBoard({
  initialPlayers,
}: DraftBoardProps) {
  const [picks, setPicks] = useState<DraftPick[]>([]);

  const availablePlayers = useMemo(() => {
    const draftedPlayerIds = new Set(
      picks.map((pick) => pick.player.id),
    );

    return initialPlayers.filter(
      (player) => !draftedPlayerIds.has(player.id),
    );
  }, [initialPlayers, picks]);

  const nextPickNumber = picks.length + 1;

  const currentRoundNumber = Math.ceil(
    nextPickNumber / TEAM_COUNT,
  );
  
  const positionInsideRound =
    (nextPickNumber - 1) % TEAM_COUNT;
  
  const isReverseRound =
    currentRoundNumber % 2 === 0;
  
  const currentTeamNumber = isReverseRound
    ? TEAM_COUNT - positionInsideRound
    : positionInsideRound + 1;

  function draftPlayer(player: Player) {
    const newPick: DraftPick = {
      pickNumber: nextPickNumber,
      roundNumber: currentRoundNumber,
      teamNumber: currentTeamNumber,
      player,
    };

    setPicks((currentPicks) => [
      ...currentPicks,
      newPick,
    ]);
  }

  function undoLastPick() {
    setPicks((currentPicks) =>
      currentPicks.slice(0, -1),
    );
  }

  const teamNumbers = Array.from(
    { length: TEAM_COUNT },
    (_, index) => index + 1,
  );

  return (
    <div>
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold">
            Fantasy Draft Board
          </h1>

          <p className="mt-2 text-slate-400">
            Pick {nextPickNumber} · Team{" "}
            {currentTeamNumber} is on the clock
          </p>
        </div>

        <button
          type="button"
          onClick={undoLastPick}
          disabled={picks.length === 0}
          className="rounded-lg border border-slate-600 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo Last Pick
        </button>
      </header>

      <div className="mt-8 overflow-x-auto">
        <div className="flex min-w-max gap-4 pb-4">
          {teamNumbers.map((teamNumber) => (
            <TeamColumn
              key={teamNumber}
              teamNumber={teamNumber}
              picks={picks.filter(
                (pick) =>
                  pick.teamNumber === teamNumber,
              )}
              isCurrentTeam={
                currentTeamNumber === teamNumber
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-10 max-w-2xl">
        <PlayerList
          players={availablePlayers}
          onDraftPlayer={draftPlayer}
        />
      </div>
    </div>
  );
}