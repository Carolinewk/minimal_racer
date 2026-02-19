import * as Pos from "./Pos";
import * as Type from "../Type";

// Convert a direction to a position delta.
export function pos(dir: Type.Dir): Type.Pos {
  switch (dir) {
    case "DW":
      return Pos.create(0, 1);
    case "LF":
      return Pos.create(-1, 0);
    case "UP":
      return Pos.create(0, -1);
    case "RG":
      return Pos.create(1, 0);
    case "UL":
      return Pos.create(-1, -1);
    case "UR":
      return Pos.create(1, -1);
    case "DL":
      return Pos.create(-1, 1);
    case "DR":
      return Pos.create(1, 1);
  }
}
