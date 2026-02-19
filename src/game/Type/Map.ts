import * as Immutable from "immutable";
import * as Pos from "./Pos";
import * as Type from "../Type";

// Create an initial map filled with tiles from a factory.
export function create(
  width: number,
  height: number,
  tile: (pos: Type.Pos) => Type.Tile
): Type.Map {
  let map: Type.Map = Immutable.Map<string, Type.Tile>();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = { x, y };
      map = map.set(Pos.key(pos), tile(pos));
    }
  }
  return map;
}

// Read a tile at a position.
export function get(
  map: Type.Map,
  pos: Type.Pos
): Type.Maybe<Type.Tile> {
  return map.get(Pos.key(pos)) || null;
}

// Set a tile at a position.
export function set(
  map: Type.Map,
  pos: Type.Pos,
  tile: Type.Tile
): Type.Map {
  return map.set(Pos.key(pos), tile);
}

// Read the entity at a position, if any.
export function entity_at(
  map: Type.Map,
  pos: Type.Pos
): Type.Entity | null {
  const tile = get(map, pos);
  return (tile && tile.entity) || null;
}

// Set an on-walk handler on a tile.
export function set_on_walk(
  map: Type.Map,
  pos: Type.Pos,
  walk: Type.OnWalk
): Type.Map {
  const tile = get(map, pos);
  if (!tile) {
    return map;
  }
  return set(map, pos, { ...tile, on_walk: walk });
}
