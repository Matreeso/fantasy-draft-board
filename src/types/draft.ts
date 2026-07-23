export type Player = {
    id: number;
    name: string;
    position: string;
    nfl_team: string | null;
  };
  
  export type DraftPick = {
    pickNumber: number;
    teamNumber: number;
    roundNumber: number;
    player: Player;
  };