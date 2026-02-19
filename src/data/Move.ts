import * as Type from "../game/Type";

export const move_table: Record<Type.Move, Type.MoveData> = {
  scratch: {
    id: "scratch",
    name: "SCRATCH",
    kind: "damage",
    power: 15
  },
  chill: {
    id: "chill",
    name: "CHILL",
    kind: "heal",
    power: 15
  }
};
