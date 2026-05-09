export type Profile = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
};

export type RoomStatus = "waiting" | "playing" | "finished";

export type Room = {
  id: string;
  room_code: string;
  host_id: string;
  status: RoomStatus;
  state: GameState | null;
  created_at: string;
  updated_at: string;
};

export type RoomPlayer = {
  id: string;
  room_id: string;
  user_id: string;
  player_order: number;
  color: "red" | "blue" | "green" | "yellow";
  created_at: string;
};

export type Invite = {
  id: string;
  room_id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export type PlayerState = {
  user_id: string;
  order: number;
  color: string;
  position: number;
  in_base: boolean;
  finished: boolean;
  left: boolean;
};

export type GameState = {
  players: PlayerState[];
  current_turn_order: number;
  winner: string | null;
  snakes: Record<number, number>;
  ladders: Record<number, number>;
  last_roll: {
    white1: number;
    white2: number;
    red: number;
    by: string;
  } | null;
};
