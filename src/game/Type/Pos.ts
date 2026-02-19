import * as Util from "../Util";
import * as Type from "../Type";

// Build a position record.
export function create(x: number, y: number): Type.Pos {
  return { x, y };
}

// Build a key string from x and y.
function key_xy(x: number, y: number): string {
  return `${x},${y}`;
}

// Build a key string from a position.
export function key(p: Type.Pos): string {
  return key_xy(p.x, p.y);
}

// Compare two positions for equality.
export function equal(a: Type.Pos, b: Type.Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

// Add two positions.
export function add(a: Type.Pos, b: Type.Pos): Type.Pos {
  return create(a.x + b.x, a.y + b.y);
}

// Build a list of map positions around an origin for one radius.
export function ring_positions(
  origin: Type.Pos,
  radius: number
): Type.Pos[] {
  if (radius <= 0) {
    return [{ ...origin }];
  }
  const out: Type.Pos[] = [];
  for (let dx = -radius; dx <= radius; dx++) {
    out.push({ x: origin.x + dx, y: origin.y - radius });
    out.push({ x: origin.x + dx, y: origin.y + radius });
  }
  for (let dy = -radius + 1; dy <= radius - 1; dy++) {
    out.push({ x: origin.x - radius, y: origin.y + dy });
    out.push({ x: origin.x + radius, y: origin.y + dy });
  }
  return out;
}

// Interpolate between two positions by tick.
export function lerp(
  prev: Type.Pos,
  cur: Type.Pos,
  last: number,
  tick: number,
  move: number
): Type.Pos {
  const elapsed = Util.clamp(tick - last, 0, move);
  if (move === 0) {
    return create(cur.x, cur.y);
  }
  const t = elapsed / move;
  const x = prev.x + (cur.x - prev.x) * t;
  const y = prev.y + (cur.y - prev.y) * t;
  return create(x, y);
}

// Convert a delta to a direction.
export function delta_dir(delta: Type.Pos): Type.Dir {
  if (delta.x === 1) {
    return "RG";
  }
  if (delta.x === -1) {
    return "LF";
  }
  if (delta.y === 1) {
    return "DW";
  }
  return "UP";
}
