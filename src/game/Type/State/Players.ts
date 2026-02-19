import * as Const from "../../Const";
import * as Battle from "./Battle";
import * as Dialog from "./Dialog";
import * as Menu from "./Menu";
import * as State from "../State";
import * as Creature from "../Creature";
import * as Entity from "../Entity";
import * as Map from "../Map";
import * as Post from "../Post";
import * as Pos from "../Pos";
import * as Tile from "../Tile";
import * as Type from "../../Type";

const player_sprite: Type.Sprite = "ent_red";
const tree_ground: Type.Sprite = "tile_tree_00_00";
export const max_players = 7;
const player_timeout_ticks = Const.tick_rate * 30;
const idle_keys: Type.MoveKeys = { a: false, s: false, d: false, w: false };
const player_name_default = "Player";
const player_name_max_chars = 16;

function player_name_value(raw: string): string {
  const name = raw.trim().slice(0, player_name_max_chars);
  if (!name) {
    return player_name_default;
  }
  return name;
}

function player_default(state: Type.State): Type.PlayerState {
  return {
    player_name: player_name_default,
    player_pos: state.spawn_pos,
    dialog: null,
    menu: null,
    battle: null,
    last_seen_tick: state.tick
  };
}

// Read sorted player ids for deterministic update order.
export function player_ids(state: Type.State): string[] {
  const ids = Object.keys(state.players);
  ids.sort();
  return ids;
}

// Count players that have pressed ready.
export function ready_total(state: Type.State): number {
  return Object.keys(state.ready_players).length;
}

// Check whether one player is already marked ready.
export function player_is_ready(state: Type.State, pid: string): boolean {
  return state.ready_players[pid] === 1;
}

// Read whether the match already has a winner.
export function game_finished(state: Type.State): boolean {
  return state.winner_name !== null;
}

// Read whether the start countdown is currently active.
export function game_countdown_active(state: Type.State): boolean {
  if (game_finished(state)) {
    return false;
  }
  if (!state.game_started) {
    return false;
  }
  if (state.timer_start_tick !== null) {
    return false;
  }
  if (state.game_start_tick === null) {
    return false;
  }
  return true;
}

// Read whether the countdown overlay should be visible.
export function game_countdown_visible(state: Type.State): boolean {
  if (game_finished(state)) {
    return false;
  }
  if (!state.game_started) {
    return false;
  }
  if (state.game_start_tick === null) {
    return false;
  }
  if (state.timer_start_tick === null) {
    return true;
  }
  return state.tick === state.timer_start_tick;
}

// Read the current countdown value from 5 down to 0.
export function game_countdown_value(state: Type.State): number {
  if (game_finished(state)) {
    return 0;
  }
  if (!state.game_started) {
    return 0;
  }
  const start_tick = state.game_start_tick;
  if (start_tick === null) {
    return 0;
  }
  const elapsed_ticks = Math.max(0, state.tick - start_tick);
  const elapsed_seconds = Math.floor(elapsed_ticks / Const.tick_rate);
  const value = Const.start_countdown_from - elapsed_seconds;
  if (value <= 0) {
    return 0;
  }
  return value;
}

// Advance countdown-to-timer transition once countdown reaches zero.
export function game_countdown_progress(state: Type.State): Type.State {
  if (!game_countdown_active(state)) {
    return state;
  }
  const start_tick = state.game_start_tick;
  if (start_tick === null) {
    return state;
  }
  if (state.tick - start_tick < Const.start_countdown_ticks) {
    return state;
  }
  return {
    ...state,
    timer_start_tick: state.tick
  };
}

// Read one player runtime state by id.
export function player_get(
  state: Type.State,
  pid: string
): Type.Maybe<Type.PlayerState> {
  const player = state.players[pid];
  if (!player) {
    return null;
  }
  return player;
}

// Persist one player's visible name.
export function player_name_set(
  state: Type.State,
  pid: string,
  player_name: string
): Type.State {
  const player = player_get(state, pid);
  if (!player) {
    return state;
  }
  const next_name = player_name_value(player_name);
  if (player.player_name === next_name) {
    return state;
  }
  const players: Type.Players = {
    ...state.players,
    [pid]: {
      ...player,
      player_name: next_name
    }
  };
  return {
    ...state,
    players
  };
}

// Project one player's runtime values onto the active view fields.
export function player_project(
  state: Type.State,
  pid: string
): { shared: Type.State; player: Type.PlayerState } {
  const player = player_get(state, pid) || player_default(state);
  return {
    shared: state,
    player
  };
}

// Persist active view fields back into one player's runtime record.
export function player_commit(
  state: Type.State,
  pid: string,
  scoped: { shared: Type.State; player: Type.PlayerState }
): Type.State {
  if (!player_get(state, pid)) {
    return state;
  }
  const next_player: Type.PlayerState = scoped.player;
  const players: Type.Players = { ...state.players, [pid]: next_player };
  return {
    ...scoped.shared,
    players
  };
}

// Build a default starter party for a new player.
function player_party(): Type.Creature[] {
  const mon = Creature.create("minifox", "Minifox", 5);
  return [mon];
}

// Check if a position can be used as a player spawn point.
function can_spawn(
  map: Type.Map,
  pos: Type.Pos
): boolean {
  const tile = Map.get(map, pos);
  if (!tile) {
    return false;
  }
  if (tile.ground === tree_ground) {
    return false;
  }
  if (tile.entity) {
    return false;
  }
  return Tile.can_step(tile);
}

// Find a deterministic spawn tile on the spawn column.
function find_spawn(
  map: Type.Map,
  origin: Type.Pos
): Type.Maybe<Type.Pos> {
  const max_radius = Const.world_height;
  for (let radius = 0; radius <= max_radius; radius++) {
    const up_y = origin.y - radius;
    if (up_y >= 0) {
      const up = Pos.create(origin.x, up_y);
      if (can_spawn(map, up)) {
        return up;
      }
    }

    const down_y = origin.y + radius;
    if (down_y < Const.world_height && down_y !== up_y) {
      const down = Pos.create(origin.x, down_y);
      if (can_spawn(map, down)) {
        return down;
      }
    }
  }
  return null;
}

// Reset one player entity to a spawn tile with neutral movement input.
function player_entity_reset(
  entity: Type.Entity,
  pos: Type.Pos,
  tick: number
): Type.Entity {
  return {
    ...entity,
    curr_pos: pos,
    prev_pos: pos,
    direction: "DW",
    last_tick: tick,
    turn_tick: tick,
    keys: idle_keys
  };
}

// Force all active players onto the spawn column using deterministic order.
function players_force_spawn_column(state: Type.State): Type.State {
  const ids = player_ids(state);
  const source_map = state.map;
  let map = state.map;
  let players: Type.Players = { ...state.players };
  const entities: Record<string, Type.Maybe<Type.Entity>> = {};

  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const player = players[pid];
    if (!player) {
      continue;
    }
    const tile = Map.get(source_map, player.player_pos);
    if (tile && tile.entity && tile.entity.name === "Player") {
      entities[pid] = tile.entity;
    } else {
      entities[pid] = null;
    }
  }

  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const player = players[pid];
    if (!player) {
      continue;
    }
    const tile = Map.get(map, player.player_pos);
    if (!tile || !tile.entity) {
      continue;
    }
    if (tile.entity.name !== "Player") {
      continue;
    }
    map = Map.set(map, player.player_pos, { ...tile, entity: null });
  }

  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const player = players[pid];
    if (!player) {
      continue;
    }
    const spawn = find_spawn(map, state.spawn_pos);
    if (!spawn) {
      continue;
    }
    const tile = Map.get(map, spawn);
    if (!tile || tile.entity) {
      continue;
    }

    let entity = entities[pid];
    if (!entity) {
      entity = Entity.create("Player", player_sprite, spawn, player_party(), null);
    }
    const moved = player_entity_reset(entity, spawn, state.tick);
    map = Map.set(map, spawn, { ...tile, entity: moved });
    players = {
      ...players,
      [pid]: {
        ...player,
        player_pos: spawn,
        dialog: null,
        menu: null,
        battle: null
      }
    };
  }

  return {
    ...state,
    map,
    players
  };
}

// Mark the match winner and freeze timer progression.
function game_finish(
  state: Type.State,
  winner_name: string
): Type.State {
  if (game_finished(state)) {
    return state;
  }
  return {
    ...state,
    winner_name: player_name_value(winner_name),
    game_end_tick: state.tick
  };
}

// Start the match countdown and force all players to the spawn column.
function game_start_begin(state: Type.State): Type.State {
  if (state.game_started) {
    return state;
  }
  const next = players_force_spawn_column(state);
  return {
    ...next,
    ready_players: {},
    game_started: true,
    game_start_tick: state.tick,
    winner_name: null,
    game_end_tick: null,
    timer_start_tick: null
  };
}

// Add a player to the world if it is not already present.
export function player_join(
  state: Type.State,
  pid: string,
  player_name: string
): Type.State {
  const existing = player_get(state, pid);
  if (existing) {
    return player_name_set(state, pid, player_name);
  }
  const player_total = Object.keys(state.players).length;
  if (player_total >= max_players) {
    return state;
  }

  const spawn = find_spawn(state.map, state.spawn_pos);
  if (!spawn) {
    return state;
  }
  const tile = Map.get(state.map, spawn);
  if (!tile || tile.entity) {
    return state;
  }

  const entity = Entity.create(
    "Player",
    player_sprite,
    spawn,
    player_party(),
    null
  );
  const map = Map.set(state.map, spawn, { ...tile, entity });
  const player: Type.PlayerState = {
    player_name: player_name_value(player_name),
    player_pos: spawn,
    dialog: null,
    menu: null,
    battle: null,
    last_seen_tick: state.tick
  };
  const players: Type.Players = { ...state.players, [pid]: player };
  return {
    ...state,
    map,
    players
  };
}

// Remove a player from the world map and players table.
export function player_leave(
  state: Type.State,
  pid: string
): Type.State {
  const player = player_get(state, pid);
  if (!player) {
    return state;
  }
  let map = state.map;
  const tile = Map.get(map, player.player_pos);
  if (tile && tile.entity) {
    if (tile.entity.name === "Player") {
      map = Map.set(map, player.player_pos, { ...tile, entity: null });
    }
  }

  const players: Type.Players = { ...state.players };
  delete players[pid];
  const ready_players: Type.ReadyPlayers = { ...state.ready_players };
  delete ready_players[pid];
  let timer_start_tick = state.timer_start_tick;
  let game_started = state.game_started;
  let game_start_tick = state.game_start_tick;
  let winner_name = state.winner_name;
  let game_end_tick = state.game_end_tick;
  if (Object.keys(players).length === 0) {
    timer_start_tick = null;
    game_started = false;
    game_start_tick = null;
    winner_name = null;
    game_end_tick = null;
  }
  return {
    ...state,
    map,
    players,
    ready_players,
    game_started,
    game_start_tick,
    winner_name,
    game_end_tick,
    timer_start_tick
  };
}

// Mark one player as ready and auto-start when all slots are ready.
export function player_ready(
  state: Type.State,
  pid: string
): Type.State {
  if (state.game_started || game_finished(state)) {
    return state;
  }
  if (!player_get(state, pid)) {
    return state;
  }
  if (player_is_ready(state, pid)) {
    return state;
  }
  let next: Type.State = {
    ...state,
    ready_players: { ...state.ready_players, [pid]: 1 }
  };
  if (ready_total(next) >= max_players) {
    next = game_start_begin(next);
  }
  return next;
}

// Start the game once at least two players are ready.
export function game_start_try(
  state: Type.State,
  pid: string
): Type.State {
  if (state.game_started || game_finished(state)) {
    return state;
  }
  if (!player_get(state, pid)) {
    return state;
  }
  if (ready_total(state) < 2) {
    return state;
  }
  return game_start_begin(state);
}

// Refresh one player's liveness tick.
export function player_touch(
  state: Type.State,
  pid: string
): Type.State {
  const player = player_get(state, pid);
  if (!player) {
    return state;
  }
  if (player.last_seen_tick === state.tick) {
    return state;
  }
  const next_player: Type.PlayerState = {
    ...player,
    last_seen_tick: state.tick
  };
  const players: Type.Players = { ...state.players, [pid]: next_player };
  return {
    ...state,
    players
  };
}

// Remove players that have not posted in a long time.
export function expire_inactive(state: Type.State): Type.State {
  let next = state;
  const ids = player_ids(next);
  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const player = player_get(next, pid);
    if (!player) {
      continue;
    }
    const idle_ticks = next.tick - player.last_seen_tick;
    if (idle_ticks <= player_timeout_ticks) {
      continue;
    }
    next = player_leave(next, pid);
  }
  return next;
}

// Project the shared state into one player's view state for rendering.
export function player_view(
  state: Type.State,
  pid: string
): { shared: Type.State; player: Type.PlayerState } {
  const player = player_get(state, pid) || player_default(state);
  return {
    shared: state,
    player
  };
}

// Update one scoped player's state on the current tick.
export function on_tick_player(
  state: { shared: Type.State; player: Type.PlayerState },
  tick: number
): { shared: Type.State; player: Type.PlayerState } {
  if (game_finished(state.shared)) {
    return state;
  }
  if (state.player.battle) {
    return Battle.on_tick(state, tick);
  }
  if (game_countdown_active(state.shared)) {
    return state;
  }
  if (state.player.dialog || state.player.menu) {
    return state;
  }

  const entity = Map.entity_at(state.shared.map, state.player.player_pos);
  if (!entity) {
    return state;
  }

  let dx = 0;
  if (entity.keys.d) {
    dx += 1;
  }
  if (entity.keys.a) {
    dx -= 1;
  }
  let dy = 0;
  if (entity.keys.s) {
    dy += 1;
  }
  if (entity.keys.w) {
    dy -= 1;
  }

  if (dx === 0 && dy === 0) {
    if (entity.turn_tick > entity.last_tick) {
      return State.player_transform(state, player => {
        return { ...player, turn_tick: player.last_tick };
      });
    }
    return state;
  }

  if (tick - entity.last_tick < Const.move_cooldown) {
    return state;
  }

  let delta: Type.Pos;
  if (dx !== 0 && dy !== 0) {
    delta = { x: dx, y: 0 };
  } else {
    delta = { x: dx, y: dy };
  }

  const dir = Pos.delta_dir(delta);
  if (dir !== entity.direction) {
    const elapsed = tick - entity.last_tick;
    const was_walking = elapsed <= Const.move_cooldown;
    const turned = State.player_transform(state, player => {
      let turn_tick = player.turn_tick;
      if (!was_walking) {
        turn_tick = tick;
      }
      return { ...player, direction: dir, turn_tick };
    });
    if (was_walking) {
      return Battle.try_move(turned, turned.player.player_pos, delta, tick);
    }
    return turned;
  }

  if (entity.turn_tick > entity.last_tick) {
    if (tick - entity.turn_tick < Const.turn_cooldown) {
      return state;
    }
  }

  return Battle.try_move(state, state.player.player_pos, delta, tick);
}

// Check if the player is currently facing the bird entity.
function player_facing_bird(
  state: { shared: Type.State; player: Type.PlayerState }
): boolean {
  const tile = State.player_tile_facing(state);
  if (!tile || !tile.entity) {
    return false;
  }
  return tile.entity.name === "Bird";
}

// Apply one scoped key post to the active player state.
export function on_key_post(
  post: Post.KeyPost,
  state: { shared: Type.State; player: Type.PlayerState }
): { shared: Type.State; player: Type.PlayerState } {
  if (game_finished(state.shared)) {
    return state;
  }
  if (state.player.battle) {
    return Battle.on_post(post, state);
  }

  const key = post.key;
  const down = post.down === 1;
  const tick = state.shared.tick;

  if (state.player.menu) {
    return Menu.on_post(post, state);
  }

  if (key === "A" || key === "S" || key === "D" || key === "W") {
    if (down && state.player.dialog) {
      return state;
    }
    const k = key.toLowerCase() as "a" | "s" | "d" | "w";
    return State.player_transform(state, entity => {
      const keys = { ...entity.keys, [k]: down };
      return { ...entity, keys };
    });
  }

  if (game_countdown_active(state.shared)) {
    return state;
  }

  if (!down) {
    return state;
  }

  if (state.player.dialog) {
    return Dialog.on_post(post, state);
  }

  switch (key) {
    case "J": {
      if (state.shared.game_started && player_facing_bird(state)) {
        return {
          ...state,
          shared: game_finish(state.shared, state.player.player_name)
        };
      }
      return Dialog.open_facing(state, tick);
    }
    case "L": {
      return Menu.open(state);
    }
    default:
      return state;
  }
}
