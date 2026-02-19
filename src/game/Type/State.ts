import * as Const from "../Const";
import * as Dir from "./Dir";
import * as Entity from "./Entity";
import * as Map from "./Map";
import * as Pos from "./Pos";
import * as Tile from "./Tile";
import * as Type from "../Type";

// Update the player entity with a transform function.
export function player_transform(
  state: { shared: Type.State; player: Type.PlayerState },
  fn: (entity: Type.Entity) => Type.Entity
): { shared: Type.State; player: Type.PlayerState } {
  const tile = Map.get(state.shared.map, state.player.player_pos);
  if (!tile || !tile.entity) {
    return state;
  }
  const updated = fn(tile.entity);
  const updated_tile = { ...tile, entity: updated };
  const map = Map.set(state.shared.map, state.player.player_pos, updated_tile);
  const shared = { ...state.shared, map };
  return { ...state, shared };
}

// Read the tile in front of the player.
export function player_tile_facing(
  state: { shared: Type.State; player: Type.PlayerState }
): Type.Maybe<Type.Tile> {
  const entity = Map.entity_at(state.shared.map, state.player.player_pos);
  if (!entity) {
    return null;
  }
  const delta = Dir.pos(entity.direction);
  const pos = Pos.add(state.player.player_pos, delta);
  return Map.get(state.shared.map, pos);
}

// Relocate an entity to a target tile with optional instant move.
function entity_relocate_raw(
  state: { shared: Type.State; player: Type.PlayerState },
  entity: Type.Entity,
  from: Type.Pos,
  to: Type.Pos,
  dir: Type.Dir,
  tick: number,
  instant: boolean
): { shared: Type.State; player: Type.PlayerState } {
  const from_tile = Map.get(state.shared.map, from);
  const to_tile = Map.get(state.shared.map, to);
  if (!from_tile || !to_tile) {
    return state;
  }
  if (!Tile.can_step(to_tile)) {
    return state;
  }

  let prev = entity.curr_pos;
  if (instant) {
    prev = to;
  }

  const moved = Entity.move(entity, prev, to, dir, tick);
  const from_next = { ...from_tile, entity: null };
  const to_next = { ...to_tile, entity: moved };

  let map = Map.set(state.shared.map, from, from_next);
  map = Map.set(map, to, to_next);

  let player = state.player;
  if (Pos.equal(from, state.player.player_pos)) {
    player = { ...player, player_pos: to };
  }
  const shared = { ...state.shared, map };
  return { ...state, shared, player };
}

// Relocate an entity to a target tile (validates collision).
export function entity_relocate(
  state: { shared: Type.State; player: Type.PlayerState },
  from: Type.Pos,
  to: Type.Pos,
  dir: Type.Dir,
  tick: number
): { shared: Type.State; player: Type.PlayerState } {
  const entity = Map.entity_at(state.shared.map, from);
  if (!entity) {
    return state;
  }
  return entity_relocate_raw(state, entity, from, to, dir, tick, false);
}

// Teleport an entity to a target tile (no cooldown or on-walk).
export function entity_teleport(
  state: { shared: Type.State; player: Type.PlayerState },
  from: Type.Pos,
  to: Type.Pos,
  tick: number
): { shared: Type.State; player: Type.PlayerState } {
  const entity = Map.entity_at(state.shared.map, from);
  if (!entity) {
    return state;
  }
  const dir = entity.direction;
  return entity_relocate_raw(state, entity, from, to, dir, tick, true);
}

// Walk an entity by a delta (validates cooldown and collision).
export function entity_walk(
  state: { shared: Type.State; player: Type.PlayerState },
  from: Type.Pos,
  delta: Type.Pos,
  tick: number
): { shared: Type.State; player: Type.PlayerState } {
  const entity = Map.entity_at(state.shared.map, from);
  if (!entity) {
    return state;
  }
  if (tick - entity.last_tick < Const.move_cooldown) {
    return state;
  }

  const to = Pos.add(from, delta);
  const to_tile = Map.get(state.shared.map, to);
  if (!to_tile) {
    return state;
  }

  if (to_tile.on_walk) {
    return to_tile.on_walk(state, from, delta, tick);
  }

  const dir = Pos.delta_dir(delta);
  return entity_relocate(state, from, to, dir, tick);
}
