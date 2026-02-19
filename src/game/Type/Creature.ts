import * as Monster from "./Monster";
import * as Type from "../Type";

// Clone a creature record for immutable updates.
export function copy(mon: Type.Creature): Type.Creature {
  return { ...mon, moves: [...mon.moves] };
}

// Build a new creature from a monster specie id.
export function create(
  specie_id: Type.Specie,
  nick: string,
  lvl: number
): Type.Creature {
  const spec = Monster.by_id[specie_id];
  const mhp = spec.hp;
  return {
    specie_id,
    nick,
    lvl,
    chp: mhp,
    mhp,
    atk: spec.atk,
    def: spec.def,
    spa: spec.spa,
    spd: spec.spd,
    spe: spec.spe,
    exp: 0,
    moves: ["scratch", "chill"],
    color: spec.color
  };
}

// Clone a party list for immutable updates.
export function party_copy(party: Type.Creature[]): Type.Creature[] {
  const next: Type.Creature[] = [];
  for (let i = 0; i < party.length; i++) {
    next.push(copy(party[i]));
  }
  return next;
}

// Count the party entries that can be shown in selectors.
export function party_total(party: Type.Creature[]): number {
  let total = party.length;
  if (total > 6) {
    total = 6;
  }
  return total;
}

// Build a party list where index 0 is swapped with another index.
export function party_swap_first(
  party: Type.Creature[],
  idx: number
): Type.Maybe<Type.Creature[]> {
  const total = party_total(party);
  if (total <= 0) {
    return null;
  }
  if (idx < 0 || idx >= total) {
    return null;
  }
  const next = party_copy(party);
  const first = next[0];
  const pick = next[idx];
  if (!first || !pick) {
    return null;
  }
  next[0] = pick;
  next[idx] = first;
  return next;
}
