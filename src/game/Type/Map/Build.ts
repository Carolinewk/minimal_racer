import * as Map from "../Map";
import * as Pos from "../Pos";
import * as State from "../State";
import * as Type from "../../Type";

type ParsedMap = {
  entity_rows: Type.Glyph[][];
  ground_rows: Type.Glyph[][];
};

type RegionCell = {
  coord: Type.Pos;
  span: Type.GlyphSpan;
};

type RegionMap = Record<string, RegionCell>;

const empty_glyph = "   ";

// Parse one map line in XXX| cell format.
function parse_line(line: string): Type.Glyph[] {
  let text = line;
  if (text.endsWith("\r")) {
    text = text.slice(0, -1);
  }
  if (text === "") {
    return [];
  }
  if (text.length % 4 !== 0) {
    throw new Error("bad map line: " + line);
  }

  const row: Type.Glyph[] = [];
  for (let i = 0; i < text.length; i += 4) {
    const cell = text.slice(i, i + 4);
    if (cell.length !== 4 || cell[3] !== "|") {
      throw new Error("bad map cell: " + cell);
    }
    row.push(cell.slice(0, 3));
  }

  return row;
}

// Parse a world map with entity and ground rows.
function parse_map(map_str: string): ParsedMap {
  const raw_lines = map_str.split("\n");
  const lines: string[] = [];

  for (let i = 0; i < raw_lines.length; i++) {
    const line = raw_lines[i];
    if (line.trim() === "") {
      continue;
    }
    lines.push(line);
  }

  if (lines.length % 2 !== 0) {
    throw new Error("bad map: odd line count");
  }

  const entity_rows: Type.Glyph[][] = [];
  const ground_rows: Type.Glyph[][] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const entity_row = parse_line(lines[i]);
    const ground_row = parse_line(lines[i + 1]);
    if (entity_row.length !== ground_row.length) {
      throw new Error("bad map: row width mismatch");
    }
    entity_rows.push(entity_row);
    ground_rows.push(ground_row);
  }

  return { entity_rows, ground_rows };
}

// Read a glyph token from map rows.
function at(
  rows: Type.Glyph[][],
  x: number,
  y: number
): Type.Glyph {
  if (y < 0 || y >= rows.length) {
    return empty_glyph;
  }
  const row = rows[y];
  if (x < 0 || x >= row.length) {
    return empty_glyph;
  }
  return row[x];
}

// Read all 8 neighbor glyphs around a cell.
function neighbors(
  rows: Type.Glyph[][],
  x: number,
  y: number
): Type.GlyphBorder {
  return {
    UP: at(rows, x, y - 1),
    DW: at(rows, x, y + 1),
    LF: at(rows, x - 1, y),
    RG: at(rows, x + 1, y),
    UL: at(rows, x - 1, y - 1),
    UR: at(rows, x + 1, y - 1),
    DL: at(rows, x - 1, y + 1),
    DR: at(rows, x + 1, y + 1)
  };
}

// Set the ground sprite for one tile.
function set_ground(
  map: Type.Map,
  pos: Type.Pos,
  ground: Type.Sprite
): Type.Map {
  const tile = Map.get(map, pos);
  if (!tile) {
    return map;
  }
  return Map.set(map, pos, { ...tile, ground });
}

// Set the entity for one tile.
function set_entity(
  map: Type.Map,
  pos: Type.Pos,
  entity: Type.Entity
): Type.Map {
  const tile = Map.get(map, pos);
  if (!tile) {
    return map;
  }
  return Map.set(map, pos, { ...tile, entity });
}

// Build region coord/span metadata for all map cells.
function region_data(rows: Type.Glyph[][]): RegionMap {
  const regions: RegionMap = {};
  const seen = new Set<string>();

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const start = Pos.create(x, y);
      const key = Pos.key(start);
      if (seen.has(key)) {
        continue;
      }

      const glyph = row[x];
      const stack: Type.Pos[] = [start];
      const cells: Type.Pos[] = [];
      seen.add(key);

      let min_x = x;
      let max_x = x;
      let min_y = y;
      let max_y = y;

      while (stack.length > 0) {
        const pos = stack.pop();
        if (!pos) {
          continue;
        }
        cells.push(pos);

        if (pos.x < min_x) {
          min_x = pos.x;
        }
        if (pos.x > max_x) {
          max_x = pos.x;
        }
        if (pos.y < min_y) {
          min_y = pos.y;
        }
        if (pos.y > max_y) {
          max_y = pos.y;
        }

        const near = [
          Pos.create(pos.x, pos.y - 1),
          Pos.create(pos.x, pos.y + 1),
          Pos.create(pos.x - 1, pos.y),
          Pos.create(pos.x + 1, pos.y)
        ];

        for (let i = 0; i < near.length; i++) {
          const next = near[i];
          if (next.y < 0 || next.y >= rows.length) {
            continue;
          }
          const next_row = rows[next.y];
          if (next.x < 0 || next.x >= next_row.length) {
            continue;
          }
          if (next_row[next.x] !== glyph) {
            continue;
          }
          const next_key = Pos.key(next);
          if (seen.has(next_key)) {
            continue;
          }
          seen.add(next_key);
          stack.push(next);
        }
      }

      const span: Type.GlyphSpan = {
        w: max_x - min_x + 1,
        h: max_y - min_y + 1
      };

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const coord = Pos.create(cell.x - min_x, cell.y - min_y);
        regions[Pos.key(cell)] = { coord, span };
      }
    }
  }

  return regions;
}

// Apply one glyph to a tile.
function apply(
  map: Type.Map,
  table: Record<Type.Glyph, Type.GlyphFn>,
  glyph: Type.Glyph,
  pos: Type.Pos,
  map_pos: Type.Pos,
  rows: Type.Glyph[][],
  regions: RegionMap
): { map: Type.Map; player: boolean } {
  const fn = table[glyph];
  if (!fn) {
    throw new Error("bad glyph: " + glyph);
  }

  const region = regions[Pos.key(map_pos)];
  if (!region) {
    throw new Error("missing region at: " + Pos.key(map_pos));
  }

  const border = neighbors(rows, map_pos.x, map_pos.y);
  const out = fn(
    glyph,
    pos,
    region.coord,
    border,
    region.span
  );

  let next_map = map;
  let player = false;
  if (!out) {
    return { map: next_map, player };
  }
  if (typeof out === "string") {
    next_map = set_ground(next_map, pos, out);
    return { map: next_map, player };
  }
  next_map = set_entity(next_map, pos, out);
  if (out.name === "Player") {
    player = true;
  }

  return { map: next_map, player };
}

// Insert a map string into an existing world map.
export function insert(
  map: Type.Map,
  origin: Type.Pos,
  map_str: string,
  table: Record<Type.Glyph, Type.GlyphFn>
): { map: Type.Map; player_pos: Type.Pos | null } {
  const parsed = parse_map(map_str);
  const ground_regions = region_data(parsed.ground_rows);
  const entity_regions = region_data(parsed.entity_rows);

  let next = map;
  let player_pos: Type.Pos | null = null;

  for (let y = 0; y < parsed.ground_rows.length; y++) {
    const ground_row = parsed.ground_rows[y];
    const entity_row = parsed.entity_rows[y];

    for (let x = 0; x < ground_row.length; x++) {
      const pos = Pos.create(origin.x + x, origin.y + y);
      const map_pos = Pos.create(x, y);

      const ground_glyph = ground_row[x];
      const ground_out = apply(
        next,
        table,
        ground_glyph,
        pos,
        map_pos,
        parsed.ground_rows,
        ground_regions
      );
      next = ground_out.map;
      if (ground_out.player) {
        player_pos = pos;
      }

      const entity_glyph = entity_row[x];
      const entity_out = apply(
        next,
        table,
        entity_glyph,
        pos,
        map_pos,
        parsed.entity_rows,
        entity_regions
      );
      next = entity_out.map;
      if (entity_out.player) {
        player_pos = pos;
      }
    }
  }

  return { map: next, player_pos };
}

// Build an on-walk teleport handler.
export function teleport(target: Type.Pos): Type.OnWalk {
  return (state, from, delta, tick) => {
    const entity = Map.entity_at(state.shared.map, from);
    if (!entity) {
      return state;
    }
    return State.entity_teleport(state, from, target, tick);
  };
}
