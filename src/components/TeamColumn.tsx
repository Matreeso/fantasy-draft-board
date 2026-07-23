import type { DraftPick } from "@/types/draft";

type TeamColumnProps = {
  teamNumber: number;
  picks: DraftPick[];
  isCurrentTeam: boolean;
};

export function TeamColumn({
  teamNumber,
  picks,
  isCurrentTeam,
}: TeamColumnProps) {
  return (
    <section
      className={`min-w-56 rounded-xl border p-4 ${
        isCurrentTeam
          ? "border-yellow-400 bg-yellow-950/30"
          : "border-slate-700 bg-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Team {teamNumber}</h3>

        {isCurrentTeam && (
          <span className="rounded bg-yellow-400 px-2 py-1 text-xs font-bold text-black">
            On the clock
          </span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {picks.length === 0 ? (
          <p className="text-sm text-slate-500">
            No picks yet
          </p>
        ) : (
          picks.map((pick) => (
            <article
              key={pick.pickNumber}
              className="rounded-lg bg-slate-800 p-3"
            >
              <p className="text-xs text-slate-400">
                Pick {pick.pickNumber} · Round{" "}
                {pick.roundNumber}
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
            </article>
          ))
        )}
      </div>
    </section>
  );
}