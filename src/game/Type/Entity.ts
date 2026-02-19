import * as Const from "../Const";
import * as Pos from "./Pos";
import * as Type from "../Type";

// Build a new entity at a position.
export function create(
  name: string,
  sprite: string,
  pos: Type.Pos,
  party: Type.Creature[],
  dialog: Type.Maybe<Type.DialogText>,
  blocks = true
): Type.Entity {
  return {
    name,
    sprite,
    blocks,
    direction: "DW",
    last_tick: 0,
    turn_tick: 0,
    curr_pos: { ...pos },
    prev_pos: { ...pos },
    party,
    dialog,
    keys: { a: false, s: false, d: false, w: false }
  };
}

// Build a moved entity instance.
export function move(
  entity: Type.Entity,
  prev: Type.Pos,
  cur: Type.Pos,
  dir: Type.Dir,
  tick: number
): Type.Entity {
  return {
    ...entity,
    prev_pos: prev,
    curr_pos: cur,
    last_tick: tick,
    direction: dir
  };
}

// Interpolate entity position for the current tick.
export function pos(entity: Type.Entity, tick: number): Type.Pos {
  const prev = entity.prev_pos;
  const cur = entity.curr_pos;
  const last = entity.last_tick;
  const max = Const.move_ticks;
  return Pos.lerp(prev, cur, last, tick, max);
}
