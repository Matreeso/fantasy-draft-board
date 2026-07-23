import type { DraftPick } from "@/types/draft";

type TeamColumnProps = {
  teamName: string;
  draftPosition: number;
  picks: DraftPick[];
  isCurrentTeam: boolean;
};

export function TeamColumn({
  teamName,
  draftPosition,
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">
            Draft position {draftPosition}
          </p>

          <h3 className="font-bold">{teamName}</h3>
        </div>

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
            </article>
          ))
        )}
      </div>
    </section>
  );
}