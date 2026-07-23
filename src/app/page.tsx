import { supabase } from "@/lib/supabase/client";

type Player = {
  id: number;
  name: string;
  position: string;
  nfl_team: string | null;
};

export default async function HomePage() {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, position, nfl_team")
    .order("name");

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1 className="text-3xl font-bold">Fantasy Draft Board</h1>

        <p className="mt-6 text-red-400">
          Could not load players: {error.message}
        </p>
      </main>
    );
  }

  const players: Player[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">Fantasy Draft Board</h1>

        <p className="mt-4 text-slate-300">
          Players loaded from the Supabase backend.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <article
              key={player.id}
              className="rounded-xl border border-slate-700 bg-slate-900 p-5"
            >
              <h2 className="text-xl font-semibold">{player.name}</h2>

              <p className="mt-2 text-slate-300">
                {player.position}
                {player.nfl_team ? ` · ${player.nfl_team}` : ""}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}