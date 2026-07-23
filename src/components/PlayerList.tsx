import { useMemo, useState } from "react";

import type { Player } from "@/types/draft";

type PlayerListProps = {
  players: Player[];
  onDraftPlayer: (player: Player) => void;
  isDrafting: boolean;
};

export function PlayerList({
  players,
  onDraftPlayer,
  isDrafting,
}: PlayerListProps) {
  const [searchText, setSearchText] = useState("");

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      const searchableText = [
        player.name,
        player.position,
        player.nfl_team ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [players, searchText]);

  return (
    <section>
      <h2 className="text-2xl font-bold">Available Players</h2>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-300">
          Search players
        </span>

        <input
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search by name, position, or NFL team"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
        />
      </label>

      <p className="mt-3 text-sm text-slate-400">
        {filteredPlayers.length} player
        {filteredPlayers.length === 1 ? "" : "s"} available
      </p>

      {filteredPlayers.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900 p-4">
          <p className="text-slate-400">
            No matching players were found.
          </p>
        </div>
      ) : (
        <div className="mt-4 max-h-[700px] space-y-3 overflow-y-auto pr-2">
          {filteredPlayers.map((player) => (
            <article
              key={player.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-slate-700 bg-slate-900 p-4"
            >
              <div className="min-w-0">
                <h3 className="truncate font-semibold">
                  {player.name}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {player.position}
                  {player.nfl_team
                    ? ` · ${player.nfl_team}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                disabled={isDrafting}
                onClick={() => onDraftPlayer(player)}
                className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDrafting ? "Saving..." : "Draft"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}