import * as Const from "../../Const";
import * as Map from "../Map";
import * as Pos from "../Pos";
import * as Tile from "../Tile";
import * as Type from "../../Type";
import * as Build from "./Build";
import * as Glyph from "../../../data/Glyph";
import * as World from "../../../data/World";

const table = Glyph.table;
const origin = Pos.create(World.world_origin.x, World.world_origin.y);
const map_str = World.world_map;
const tree_ground: Type.Sprite = "tile_tree_00_00";
const spawn_column_offset = 1;

// Parse a map key string back into a position.
function key_pos(key: string): Type.Pos {
  const parts = key.split(",");
  if (parts.length !== 2) {
    throw new Error("bad map key: " + key);
  }
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    throw new Error("bad map key: " + key);
  }
  return Pos.create(x, y);
}

// Check if a tile should be treated as a teleport door.
function is_door(tile: Type.Tile): boolean {
  if (tile.entity) {
    if (tile.entity.name === "Door") {
      return true;
    }
  }
  if (tile.ground === "tile_mountain_door") {
    return true;
  }
  if (tile.ground === "tile_poke_center_01_03") {
    return true;
  }
  return false;
}

// Find all door tiles in map order.
function doors(map: Type.Map): Type.Pos[] {
  const doors: Type.Pos[] = [];
  map.forEach((tile, key) => {
    if (!is_door(tile)) {
      return;
    }
    doors.push(key_pos(key));
  });
  doors.sort((a, b) => {
    if (a.y < b.y) {
      return -1;
    }
    if (a.y > b.y) {
      return 1;
    }
    if (a.x < b.x) {
      return -1;
    }
    if (a.x > b.x) {
      return 1;
    }
    return 0;
  });
  return doors;
}

// Wire door teleports in sorted pairs. Missing or odd doors are ignored.
function wire_doors(map: Type.Map): Type.Map {
  const door_list = doors(map);
  if (door_list.length < 2) {
    return map;
  }

  let next = map;
  for (let i = 0; i + 1 < door_list.length; i += 2) {
    const out_door = door_list[i];
    const in_door = door_list[i + 1];
    const in_spawn = Pos.create(in_door.x, in_door.y - 1);
    const out_spawn = Pos.create(out_door.x, out_door.y + 1);

    const out_walk = Build.teleport(in_spawn);
    const in_walk = Build.teleport(out_spawn);
    next = Map.set_on_walk(next, out_door, out_walk);
    next = Map.set_on_walk(next, in_door, in_walk);
  }
  return next;
}

// Read map dimensions from the encoded map string.
function map_size(map_str: string): { w: number; h: number } {
  const raw_lines = map_str.split("\n");
  const lines: string[] = [];
  for (let i = 0; i < raw_lines.length; i++) {
    const line = raw_lines[i];
    if (line.trim() === "") {
      continue;
    }
    lines.push(line.endsWith("\r") ? line.slice(0, -1) : line);
  }
  if (lines.length < 2) {
    return { w: 0, h: 0 };
  }
  const row = lines[0];
  if (row.length % 4 !== 0) {
    return { w: 0, h: 0 };
  }
  return {
    w: row.length / 4,
    h: Math.floor(lines.length / 2)
  };
}

// Check if one tile can be used for player spawn.
function can_spawn(map: Type.Map, pos: Type.Pos): boolean {
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

// Pick a fallback spawn inside the authored map area.
function fallback_spawn(map: Type.Map, origin: Type.Pos, size: { w: number; h: number }): Type.Pos {
  if (size.w <= 0 || size.h <= 0) {
    return origin;
  }
  for (let y = 0; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) {
      const pos = Pos.create(origin.x + x, origin.y + y);
      if (can_spawn(map, pos)) {
        return pos;
      }
    }
  }
  return origin;
}

// Pick a spawn on the second authored column.
function second_column_spawn(
  map: Type.Map,
  origin: Type.Pos,
  size: { w: number; h: number },
  preferred_y: number
): Type.Pos {
  if (size.w <= spawn_column_offset || size.h <= 0) {
    return fallback_spawn(map, origin, size);
  }

  const x = origin.x + spawn_column_offset;
  const min_y = origin.y;
  const max_y = origin.y + size.h - 1;
  let center_y = preferred_y;
  if (center_y < min_y || center_y > max_y) {
    center_y = origin.y + Math.floor(size.h * 0.5);
  }

  const max_radius = size.h;
  for (let radius = 0; radius <= max_radius; radius++) {
    const up_y = center_y - radius;
    if (up_y >= min_y) {
      const up = Pos.create(x, up_y);
      if (can_spawn(map, up)) {
        return up;
      }
    }

    const down_y = center_y + radius;
    if (down_y <= max_y && down_y !== up_y) {
      const down = Pos.create(x, down_y);
      if (can_spawn(map, down)) {
        return down;
      }
    }
  }

  return fallback_spawn(map, origin, size);
}

// Build the complete world map with all teleports wired.
export function create(): {
  map: Type.Map;
  player_pos: Type.Pos;
} {
  const world_width = Const.world_width;
  const world_height = Const.world_height;
  let map = Map.create(world_width, world_height, Tile.create);

  const world = Build.insert(
    map,
    origin,
    map_str,
    table
  );
  map = world.map;
  map = wire_doors(map);
  const size = map_size(map_str);
  let preferred_y = origin.y + Math.floor(size.h * 0.5);
  if (world.player_pos) {
    preferred_y = world.player_pos.y;
  }
  const player_pos = second_column_spawn(map, origin, size, preferred_y);
  return { map, player_pos };
}
