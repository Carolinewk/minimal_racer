import type * as Immutable from "immutable";

// Core
// ====
// Generic primitives shared across most domain models.

export type Maybe<T> = T | null;

export type RenderMode = "IMG" | "RAW";

// Pos
// ===
// Coordinates used for world tiles, map regions, and movement deltas.

export type Pos = {
  x: number;
  y: number;
};

// Dir
// ===
// Compass directions used by movement, facing, and glyph adjacency.

export type Dir =
  | "UP"
  | "DW"
  | "LF"
  | "RG"
  | "UL"
  | "UR"
  | "DL"
  | "DR";

// Sprite
// ======
// Sprite id for any drawable ground/entity art asset.

export type Sprite = string;

// Image
// =====
// Browser image object cached by the image renderer.

export type Image = HTMLImageElement;

// Nav
// ===
// Shared input keys and cursor models for line/grid navigation UIs.

export type KeyInput = "A" | "S" | "D" | "W" | "J" | "K" | "L";

export type NavLine = {
  index: number;
  items: number;
};

export type NavGrid = {
  row_index: number;
  col_index: number;
  row_total: number;
  col_total: number;
};

// Monster
// =======
// Monster catalog entries and move metadata loaded from data tables.

export type Specie = string;

export type Move = "scratch" | "chill";

export type MoveData = {
  id: Move;
  name: string;
  kind: "damage" | "heal";
  power: number;
};

export type Monster = {
  id: Specie;
  name: string;
  sprite: string;
  color: string;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  movepool: string[];
};

// Dialog
// ======
// Dialog script content and runtime cursor/view information.

export type DialogText = string[][];

export type Dialog = {
  dialog: DialogText;
  cursor: { paragraph: number; line: number };
  last_tick: number;
};

export type DialogView = {
  top_ln: string;
  bot_ln: string;
  top_seen: number;
  bot_seen: number;
  is_done: boolean;
};

// Glyph
// =====
// Map glyph contracts used while expanding world text into map tiles.

export type Glyph = string;

export type GlyphBorder = {
  UP: Glyph;
  DW: Glyph;
  LF: Glyph;
  RG: Glyph;
  UL: Glyph;
  UR: Glyph;
  DL: Glyph;
  DR: Glyph;
};

export type GlyphSpan = {
  w: number;
  h: number;
};

export type GlyphFn = (
  glyph: Glyph,
  pos: Pos,
  coord: Pos,
  border: GlyphBorder,
  span: GlyphSpan
) => Maybe<Sprite | Entity>;

// Creature
// ========
// Runtime creature instance used in party/battle systems.

export type Creature = {
  specie_id: Specie;
  nick: string;
  lvl: number;
  chp: number;
  mhp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  exp: number;
  moves: Move[];
  color: string;
};

// Entity
// ======
// World actor model (player, NPCs, encounter entities, and interactables).

export type MoveKeys = {
  a: boolean;
  s: boolean;
  d: boolean;
  w: boolean;
};

export type Entity = {
  name: string;
  sprite: string;
  blocks: boolean;
  direction: Dir;
  last_tick: number;
  turn_tick: number;
  curr_pos: Pos;
  prev_pos: Pos;
  party: Creature[];
  dialog: Maybe<DialogText>;
  keys: MoveKeys;
};

// Battle
// ======
// Full battle state machine model including animation and queued actions.

export type BattleSide = "player" | "enemy";

export type BattleAction = {
  side: BattleSide;
  move: Move;
};

export type BattleAnim = {
  kind: "hit" | "heal";
  side: BattleSide;
  start_tick: number;
  duration: number;
};

export type BattleHpAnim = {
  side: BattleSide;
  from: number;
  to: number;
  start_tick: number;
  duration: number;
};

export type BattleCapture = {
  success: boolean;
  start_tick: number;
};

export type BattlePhase =
  | "menu"
  | "mon"
  | "moves"
  | "dialog_action"
  | "dialog_script"
  | "anim"
  | "hp"
  | "capture_throw"
  | "capture_result"
  | "run";

export type Battle = {
  party: Creature[];
  player: Creature;
  enemy: Creature;
  phase: BattlePhase;
  menu: { row: number; col: number };
  move_index: number;
  mon_index: number;
  actions: BattleAction[];
  pending_party: Maybe<Creature[]>;
  anim: Maybe<BattleAnim>;
  hp_anim: Maybe<BattleHpAnim>;
  capture: Maybe<BattleCapture>;
};

// Tile
// ====
// Single map tile model with base ground, optional entity, and walk effect.

export type OnWalk = (
  state: { shared: State; player: PlayerState },
  from_pos: Pos,
  delta: Pos,
  tick: number
) => { shared: State; player: PlayerState };

export type Tile = {
  ground: Sprite;
  entity: Maybe<Entity>;
  on_walk: Maybe<OnWalk>;
};

// Map
// ===
// Immutable tile map keyed by "x,y" string positions.

export type Map = Immutable.Map<string, Tile>;

// State
// =====
// Shared multiplayer aggregate (world + all players).

export type Menu = {
  mode: "start" | "party";
  selected_index: number;
  mon_index: number;
};

export type PlayerState = {
  player_name: string;
  player_pos: Pos;
  dialog: Maybe<Dialog>;
  menu: Maybe<Menu>;
  battle: Maybe<Battle>;
  last_seen_tick: number;
};

export type Post =
  | {
    $: "join";
    pid: string;
    player_name: string;
  }
  | {
    $: "leave";
    pid: string;
  }
  | {
    $: "key";
    pid: string;
    key: KeyInput;
    down: 0 | 1;
  }
  | {
    $: "ping";
    pid: string;
    player_name: string;
  }
  | {
    $: "ready";
    pid: string;
  }
  | {
    $: "start";
    pid: string;
  };

export type Players = Record<string, PlayerState>;
export type ReadyPlayers = Record<string, 1>;

export type State = {
  map: Map;
  spawn_pos: Pos;
  players: Players;
  ready_players: ReadyPlayers;
  game_started: boolean;
  game_start_tick: Maybe<number>;
  winner_name: Maybe<string>;
  game_end_tick: Maybe<number>;
  tick: number;
  timer_start_tick: Maybe<number>;
};
