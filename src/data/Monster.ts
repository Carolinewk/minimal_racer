import * as Type from "../game/Type";

export const by_id: Record<Type.Specie, Type.Monster> = {
  minifox: {
    id: "minifox",
    name: "Minifox",
    sprite: "0001",
    color: "#f7b9aa",
    hp: 40,
    atk: 52,
    def: 38,
    spa: 58,
    spd: 45,
    spe: 64,
    movepool: ["Scratch", "Chill"]
  },
  pasaromal: {
    id: "pasaromal",
    name: "Pasaromal",
    sprite: "0002",
    color: "#c8e2ff",
    hp: 44,
    atk: 48,
    def: 52,
    spa: 54,
    spd: 58,
    spe: 42,
    movepool: ["Scratch", "Chill"]
  },
  sadgrim: {
    id: "sadgrim",
    name: "Sadgrim",
    sprite: "0003",
    color: "#d9d2f4",
    hp: 46,
    atk: 50,
    def: 44,
    spa: 60,
    spd: 55,
    spe: 40,
    movepool: ["Scratch", "Chill"]
  },
  mapinha: {
    id: "mapinha",
    name: "Mapinha",
    sprite: "0004",
    color: "#b7e5b0",
    hp: 48,
    atk: 49,
    def: 50,
    spa: 55,
    spd: 52,
    spe: 41,
    movepool: ["Scratch", "Chill"]
  },
  looloo: {
    id: "looloo",
    name: "Looloo",
    sprite: "0005",
    color: "#d7b9ff",
    hp: 38,
    atk: 44,
    def: 36,
    spa: 62,
    spd: 54,
    spe: 60,
    movepool: ["Scratch", "Chill"]
  }
};
