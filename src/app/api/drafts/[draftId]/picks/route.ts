import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

type DeletedPick = {
  id: number;
  draft_id: number;
  draft_team_id: number;
  player_id: number;
  pick_number: number;
  round_number: number;
  created_at: string;
};

type CreatePickRequest = {
  playerId?: unknown;
};

type CreatedPick = {
  id: number;
  draft_id: number;
  draft_team_id: number;
  player_id: number;
  pick_number: number;
  round_number: number;
  created_at: string;
};

function getErrorResponse(message: string) {
  switch (message) {
    case "DRAFT_NOT_FOUND":
      return {
        status: 404,
        error: "DRAFT_NOT_FOUND",
        message: "The requested draft does not exist.",
      };

    case "DRAFT_NOT_ACTIVE":
      return {
        status: 409,
        error: "DRAFT_NOT_ACTIVE",
        message: "The draft is not currently active.",
      };

    case "PLAYER_NOT_FOUND":
      return {
        status: 404,
        error: "PLAYER_NOT_FOUND",
        message: "The requested player does not exist.",
      };

    case "PLAYER_ALREADY_DRAFTED":
      return {
        status: 409,
        error: "PLAYER_ALREADY_DRAFTED",
        message: "That player has already been drafted.",
      };

    case "DRAFT_TEAM_NOT_FOUND":
      return {
        status: 409,
        error: "DRAFT_TEAM_NOT_FOUND",
        message:
          "No fantasy team exists for the current draft position.",
      };

    default:
      return {
        status: 500,
        error: "PICK_CREATE_FAILED",
        message: "The pick could not be created.",
      };
  }
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string }>;
  },
) {
  try {
    const { draftId: draftIdText } = await params;
    const draftId = Number(draftIdText);

    if (!Number.isInteger(draftId) || draftId < 1) {
      return NextResponse.json(
        {
          error: "INVALID_DRAFT_ID",
          message: "The draft ID must be a positive integer.",
        },
        { status: 400 },
      );
    }

    let body: CreatePickRequest;

    try {
      body = (await request.json()) as CreatePickRequest;
    } catch {
      return NextResponse.json(
        {
          error: "INVALID_JSON",
          message: "The request body must contain valid JSON.",
        },
        { status: 400 },
      );
    }

    const playerId = Number(body.playerId);

    if (!Number.isInteger(playerId) || playerId < 1) {
      return NextResponse.json(
        {
          error: "INVALID_PLAYER_ID",
          message: "The player ID must be a positive integer.",
        },
        { status: 400 },
      );
    }

    /*
     * Call the PostgreSQL function.
     *
     * The function:
     * 1. Locks the draft.
     * 2. Validates the draft and player.
     * 3. Calculates snake order.
     * 4. Inserts the pick.
     * 5. Advances current_pick_number.
     */
    const { data, error } = await supabaseAdmin.rpc(
      "create_draft_pick",
      {
        requested_draft_id: draftId,
        requested_player_id: playerId,
      },
    );

    if (error) {
      console.error("create_draft_pick failed:", error);

      const knownError = getErrorResponse(error.message);

      return NextResponse.json(
        {
          error: knownError.error,
          message: knownError.message,
        },
        { status: knownError.status },
      );
    }

    /*
     * A set-returning PostgreSQL function returns an array.
     * We expect exactly one created pick.
     */
    const createdPicks = data as CreatedPick[] | null;
    const createdPick = createdPicks?.[0];

    if (!createdPick) {
      return NextResponse.json(
        {
          error: "EMPTY_PICK_RESULT",
          message:
            "The database did not return the created pick.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        pick: createdPick,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected pick API error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string }>;
  },
) {
  try {
    const { draftId: draftIdText } = await params;
    const draftId = Number(draftIdText);

    if (!Number.isInteger(draftId) || draftId < 1) {
      return NextResponse.json(
        {
          error: "INVALID_DRAFT_ID",
          message: "The draft ID must be a positive integer.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "undo_last_draft_pick",
      {
        requested_draft_id: draftId,
      },
    );

    if (error) {
      console.error("undo_last_draft_pick failed:", error);

      if (error.message.includes("DRAFT_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "DRAFT_NOT_FOUND",
            message: "The requested draft does not exist.",
          },
          { status: 404 },
        );
      }

      if (error.message.includes("NO_PICKS_TO_UNDO")) {
        return NextResponse.json(
          {
            error: "NO_PICKS_TO_UNDO",
            message: "There are no picks to undo.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: "UNDO_FAILED",
          message: "The last pick could not be undone.",
        },
        { status: 500 },
      );
    }

    const deletedPicks = data as DeletedPick[] | null;
    const deletedPick = deletedPicks?.[0];

    if (!deletedPick) {
      return NextResponse.json(
        {
          error: "EMPTY_UNDO_RESULT",
          message:
            "The database did not return the deleted pick.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      pick: deletedPick,
    });
  } catch (error) {
    console.error("Unexpected undo API error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ draftId: string }>;
  },
) {
  try {
    const { draftId: draftIdText } = await params;
    const draftId = Number(draftIdText);

    if (!Number.isInteger(draftId) || draftId < 1) {
      return NextResponse.json(
        {
          error: "INVALID_DRAFT_ID",
          message: "The draft ID must be a positive integer.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("picks")
      .select(`
        id,
        draft_id,
        draft_team_id,
        player_id,
        pick_number,
        round_number,
        created_at
      `)
      .eq("draft_id", draftId)
      .order("pick_number", {
        ascending: true,
      });

    if (error) {
      console.error("Could not load picks:", error);

      return NextResponse.json(
        {
          error: "PICKS_LOAD_FAILED",
          message: "The draft picks could not be loaded.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      picks: data ?? [],
    });
  } catch (error) {
    console.error("Unexpected picks GET error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      },
      { status: 500 },
    );
  }
}