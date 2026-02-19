import * as Type from "../Type";

// Build a sprite id from a base name and indices.
export function id(
  name: string,
  ix: number,
  iy: number
): Type.Sprite {
  const pad_x = String(ix).padStart(2, "0");
  const pad_y = String(iy).padStart(2, "0");
  return `${name}_${pad_x}_${pad_y}`;
}
