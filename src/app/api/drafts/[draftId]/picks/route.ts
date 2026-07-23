import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

type CreatePickBody = {
  playerId?: number;
};

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const { draftId: draftIdText } = await context.params;
    const draftId = Number(draftIdText);

    if (!Number.isInteger(draftId) || draftId < 1) {
      return NextResponse.json(
        {
          error: "INVALID_DRAFT_ID",
          message: "The draft ID is invalid.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as CreatePickBody;
    const playerId = body.playerId;

    if (!Number.isInteger(playerId) || Number(playerId) < 1) {
      return NextResponse.json(
        {
          error: "INVALID_PLAYER_ID",
          message: "A valid player ID is required.",
        },
        { status: 400 },
      );
    }

    const { data: draft, error: draftError } =
      await supabaseAdmin
        .from("drafts")
        .select(
          "id, team_count, current_pick_number, status",
        )
        .eq("id", draftId)
        .single();

    if (draftError || !draft) {
      return NextResponse.json(
        {
          error: "DRAFT_NOT_FOUND",
          message: "The draft could not be found.",
        },
        { status: 404 },
      );
    }

    if (draft.status !== "active") {
      return NextResponse.json(
        {
          error: "DRAFT_NOT_ACTIVE",
          message: "The draft is not currently active.",
        },
        { status: 409 },
      );
    }

    const pickNumber = draft.current_pick_number;
    const roundNumber = Math.ceil(
      pickNumber / draft.team_count,
    );

    const positionInsideRound =
      (pickNumber - 1) % draft.team_count;

    const isReverseRound = roundNumber % 2 === 0;

    const draftPosition = isReverseRound
      ? draft.team_count - positionInsideRound
      : positionInsideRound + 1;

    const { data: draftTeam, error: teamError } =
      await supabaseAdmin
        .from("draft_teams")
        .select("id")
        .eq("draft_id", draftId)
        .eq("draft_position", draftPosition)
        .single();

    if (teamError || !draftTeam) {
      return NextResponse.json(
        {
          error: "TEAM_NOT_FOUND",
          message:
            "The team for the current draft position was not found.",
        },
        { status: 409 },
      );
    }

    const { data: newPick, error: pickError } =
      await supabaseAdmin
        .from("picks")
        .insert({
          draft_id: draftId,
          draft_team_id: draftTeam.id,
          player_id: playerId,
          pick_number: pickNumber,
          round_number: roundNumber,
        })
        .select(
          "id, draft_id, draft_team_id, player_id, pick_number, round_number, created_at",
        )
        .single();

    if (pickError) {
      const isDuplicate =
        pickError.code === "23505";

      return NextResponse.json(
        {
          error: isDuplicate
            ? "DUPLICATE_PICK"
            : "PICK_CREATE_FAILED",
          message: isDuplicate
            ? "That player or pick number has already been used."
            : pickError.message,
        },
        {
          status: isDuplicate ? 409 : 500,
        },
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("drafts")
      .update({
        current_pick_number: pickNumber + 1,
      })
      .eq("id", draftId)
      .eq("current_pick_number", pickNumber);

    if (updateError) {
      return NextResponse.json(
        {
          error: "DRAFT_UPDATE_FAILED",
          message: updateError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        pick: newPick,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}