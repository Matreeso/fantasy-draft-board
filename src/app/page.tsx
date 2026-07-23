import { DraftBoard } from "@/components/DraftBoard";
import { supabase } from "@/lib/supabase/client";
import type { Player } from "@/types/draft";

export default async function HomePage() {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, position, nfl_team")
    .order("name");

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">
            Fantasy Draft Board
          </h1>

          <p className="mt-6 text-red-400">
            Could not load players: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const players: Player[] = data ?? [];

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <DraftBoard initialPlayers={players} />
      </div>
    </main>
  );
}