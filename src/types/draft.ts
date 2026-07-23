export type Player = {
    id: number;
    name: string;
    position: string;
    nfl_team: string | null;
  };
  
  export type Draft = {
    id: number;
    name: string;
    team_count: number;
    current_pick_number: number;
    status: "setup" | "active" | "paused" | "complete";
    created_at: string;
  };
  
  export type DraftTeam = {
    id: number;
    draft_id: number;
    name: string;
    draft_position: number;
    created_at: string;
  };
  
  export type DraftPick = {
    id: number;
    draft_id: number;
    draft_team_id: number;
    player_id: number;
    pick_number: number;
    round_number: number;
    created_at: string;
    player: Player;
    draftTeam: DraftTeam;
  };