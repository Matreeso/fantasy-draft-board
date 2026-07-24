import { DraftBoard } from "@/components/DraftBoard";
import {
  createClient,
} from "@/lib/supabase/server";
import type {
  DraftPick,
  DraftTeam,
  Player,
} from "@/types/draft";

import { redirect } from "next/navigation";

/*
 * Replace this number if your test draft has a different ID.
 */
const TEST_DRAFT_ID = 1;

/*
 * Without this, Next.js may generate the page once during
 * npm run build and reuse that old result.
 *
 * We want the page to fetch fresh picks whenever it is loaded.
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  /*
   * These three database requests do not depend on each other,
   * so Promise.all runs them at the same time.
   */
  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }
  
  const [
    playersResult,
    teamsResult,
    picksResult,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, position, nfl_team")
      .order("name"),

    supabase
      .from("draft_teams")
      .select(
        "id, draft_id, name, draft_position, created_at",
      )
      .eq("draft_id", TEST_DRAFT_ID)
      .order("draft_position"),

    supabase
      .from("picks")
      .select(
        `
          id,
          draft_id,
          draft_team_id,
          player_id,
          pick_number,
          round_number,
          created_at
        `,
      )
      .eq("draft_id", TEST_DRAFT_ID)
      .order("pick_number"),
  ]);

  /*
   * Check whether any request failed.
   */
  const loadingError =
    playersResult.error ??
    teamsResult.error ??
    picksResult.error;

  if (loadingError) {
    console.error("Could not load draft:", loadingError);

    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-3xl font-bold">
            Fantasy Draft Board
          </h1>

          <div className="mt-6 rounded-lg border border-red-700 bg-red-950/50 p-4 text-red-200">
            <p className="font-semibold">
              Could not load the draft.
            </p>

            <p className="mt-2 text-sm">
              {loadingError.message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * The database results are turned into our TypeScript types.
   */
  const players: Player[] = playersResult.data ?? [];

  const teams: DraftTeam[] = teamsResult.data ?? [];

  const savedPickRows = picksResult.data ?? [];

  /*
   * Create quick lookup maps.
   *
   * Instead of searching the entire player list for every pick,
   * we can look up a player using their ID.
   *
   * Example:
   * playerById.get(12)
   */
  const playerById = new Map(
    players.map((player) => [player.id, player]),
  );

  const teamById = new Map(
    teams.map((team) => [team.id, team]),
  );

  /*
   * Combine each saved pick with its full player and team.
   *
   * The picks table only stores:
   * - player_id
   * - draft_team_id
   *
   * DraftBoard expects:
   * - the pick fields
   * - the complete Player object
   * - the complete DraftTeam object
   */
  const formattedPicks: DraftPick[] = [];

  for (const pickRow of savedPickRows) {
    const player = playerById.get(pickRow.player_id);
    const draftTeam = teamById.get(
      pickRow.draft_team_id,
    );

    /*
     * A valid pick must have both a matching player
     * and a matching fantasy team.
     */
    if (!player || !draftTeam) {
      console.warn(
        `Skipping pick ${pickRow.id} because its player or team could not be found.`,
      );

      continue;
    }

    formattedPicks.push({
      id: pickRow.id,
      draft_id: pickRow.draft_id,
      draft_team_id: pickRow.draft_team_id,
      player_id: pickRow.player_id,
      pick_number: pickRow.pick_number,
      round_number: pickRow.round_number,
      created_at: pickRow.created_at,
      player,
      draftTeam,
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white sm:p-8">
      <div className="mx-auto max-w-7xl">
        <DraftBoard
          draftId={TEST_DRAFT_ID}
          initialPlayers={players}
          initialTeams={teams}
          initialPicks={formattedPicks}
          teamCount={teams.length || 4}
        />
      </div>
    </main>
  );
}