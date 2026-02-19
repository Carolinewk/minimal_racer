import * as Creature from "./Creature";
import * as Entity from "./Entity";
import * as Sprite from "./Sprite";
import * as Type from "../Type";

// Return no output for this glyph.
export function none(
  _glyph: Type.Glyph,
  _pos: Type.Pos,
  _coord: Type.Pos,
  _border: Type.GlyphBorder,
  _span: Type.GlyphSpan
): Type.Maybe<Type.Sprite | Type.Entity> {
  return null;
}

// Compute the suffix for bordered autotiles.
function borded_suffix(
  UP: boolean,
  DW: boolean,
  LF: boolean,
  RG: boolean,
  UL: boolean,
  UR: boolean,
  DL: boolean,
  DR: boolean
): string {
  if (!UP && !LF) {
    return "outer_top_lft";
  }
  if (!UP && !RG) {
    return "outer_top_rgt";
  }
  if (!DW && !LF) {
    return "outer_bot_lft";
  }
  if (!DW && !RG) {
    return "outer_bot_rgt";
  }
  if (!UP) {
    return "edge_top";
  }
  if (!DW) {
    return "edge_bot";
  }
  if (!LF) {
    return "edge_lft";
  }
  if (!RG) {
    return "edge_rgt";
  }
  if (!UL) {
    return "inner_top_lft";
  }
  if (!UR) {
    return "inner_top_rgt";
  }
  if (!DL) {
    return "inner_bot_lft";
  }
  if (!DR) {
    return "inner_bot_rgt";
  }
  return "center";
}

// Build a glyph function for bordered ground sprites.
export function borded(name: string): Type.GlyphFn {
  return (
    glyph,
    _pos,
    _coord,
    border,
    _span
  ) => {
    const UP = border.UP === glyph;
    const DW = border.DW === glyph;
    const LF = border.LF === glyph;
    const RG = border.RG === glyph;
    const UL = border.UL === glyph;
    const UR = border.UR === glyph;
    const DL = border.DL === glyph;
    const DR = border.DR === glyph;

    const suffix = borded_suffix(
      UP,
      DW,
      LF,
      RG,
      UL,
      UR,
      DL,
      DR
    );
    return `${name}_${suffix}`;
  };
}

// Build a glyph function for building ground sprites.
export function bigimg(
  name: string,
  width: number,
  height: number,
  single: boolean
): Type.GlyphFn {
  return (
    _glyph,
    _pos,
    coord,
    _border,
    span
  ) => {
    const needs_block = width > 1 || height > 1;
    if (needs_block) {
      if (span.w !== width || span.h !== height) {
        throw new Error("bad block: " + name);
      }
    }

    if (single) {
      return name;
    }
    if (width === 1 && height === 1) {
      return Sprite.id(name, 0, 0);
    }
    return Sprite.id(name, coord.x, coord.y);
  };
}

// Build a glyph function for static dialog entities.
export function entity(
  name: string,
  sprite: string,
  dialog: Type.Maybe<Type.DialogText>,
  blocks = true
): Type.GlyphFn {
  return (
    _glyph,
    pos,
    _coord,
    _border,
    _span
  ) => {
    return Entity.create(name, sprite, pos, [], dialog, blocks);
  };
}

// Build the player entity from a glyph placement.
export function player(
  _glyph: Type.Glyph,
  pos: Type.Pos,
  _coord: Type.Pos,
  _border: Type.GlyphBorder,
  _span: Type.GlyphSpan
): Type.Maybe<Type.Sprite | Type.Entity> {
  const mon = Creature.create("minifox", "Minifox", 5);
  return Entity.create("Player", "ent_red", pos, [mon], null);
}
