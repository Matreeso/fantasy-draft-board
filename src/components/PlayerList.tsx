import { useMemo, useState } from "react";

import type { Player } from "@/types/draft";

type PlayerListProps = {
  players: Player[];
  onDraftPlayer: (player: Player) => void;
};

export function PlayerList({
  players,
  onDraftPlayer,
}: PlayerListProps) {
  const [searchText, setSearchText] = useState("");

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = searchText
      .trim()
      .toLowerCase();

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
      <h2 className="text-2xl font-bold">
        Available Players
      </h2>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-slate-300">
          Search players
        </span>

        <input
          type="search"
          value={searchText}
          onChange={(event) =>
            setSearchText(event.target.value)
          }
          placeholder="Name, position, or team"
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-blue-500"
        />
      </label>

      {filteredPlayers.length === 0 ? (
        <p className="mt-4 text-slate-400">
          No matching players found.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredPlayers.map((player) => (
            <article
              key={player.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 p-4"
            >
              <div>
                <h3 className="font-semibold">
                  {player.name}
                </h3>

                <p className="text-sm text-slate-400">
                  {player.position}
                  {player.nfl_team
                    ? ` · ${player.nfl_team}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDraftPlayer(player)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
              >
                Draft
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}