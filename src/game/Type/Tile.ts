import * as Type from "../Type";

// Build the default tile for an empty map slot.
export function create(_pos: Type.Pos): Type.Tile {
  return {
    ground: "tile_grass_00_00",
    entity: null,
    on_walk: null
  };
}

// Check if a tile can be entered.
export function can_step(tile: Type.Tile): boolean {
  if (tile.entity) {
    return !tile.entity.blocks;
  }
  return true;
}

// Read dialog from a tile, if any.
export function dialog(tile: Type.Tile): Type.DialogText | null {
  return (tile.entity && tile.entity.dialog) || null;
}

// Check if a tile is dark grass.
export function is_dark_grass(tile: Type.Tile): boolean {
  return tile.ground === "tile_bush_00_00";
}
