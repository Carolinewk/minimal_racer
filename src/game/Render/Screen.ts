import * as Sprite from "../../data/Sprite";
import * as Const from "../Const";
import * as Image from "../Type/Image";
import * as Util from "../Util";
import * as Entity from "../Type/Entity";
import * as Battle from "../Type/Battle";
import * as Creature from "../Type/Creature";
import * as Map from "../Type/Map";
import * as Pos from "../Type/Pos";
import * as Players from "../Type/State/Players";
import * as Monster from "../Type/Monster";
import * as SpriteType from "../Type/Sprite";
import * as Terminal from "./Terminal";
import * as Type from "../Type";

const tile_sz = Const.tile_size;
const view_cols = Const.view_cols;
const view_rows = Const.view_rows;
const view_pad = 1;
const font_sz = 8;
const view_focus_x = 4;
const view_focus_y = 4;
const ready_panel_cols = 10;
const ready_panel_x = view_cols * tile_sz - ready_panel_cols * font_sz;
const ready_panel_y = 0;
const ready_button_cols = 8;
const ready_button_rows = 3;
const ready_button_x = Math.floor(
  (view_cols * tile_sz - ready_button_cols * font_sz) * 0.5
);
const ready_button_y = view_rows * tile_sz - ready_button_rows * font_sz;
const countdown_font_sz = tile_sz;
const countdown_bg_pad = 4;
const winner_box_cols = 18;

const dir_idx: Record<Type.Dir, number> = {
  UP: 2,
  DW: 0,
  LF: 1,
  RG: 3,
  UL: 1,
  UR: 3,
  DL: 1,
  DR: 3
};

// Draw a sprite id or fallback square.
function draw_sprite(
  ctx: CanvasRenderingContext2D,
  id: Type.Sprite,
  x: number,
  y: number,
  size: number
): void {
  const image = Image.get(id);
  if (Image.ready(image)) {
    ctx.drawImage(image, x, y, size, size);
    return;
  }
  ctx.fillStyle = "#ff00ff";
  ctx.fillRect(x, y, size, size);
}

// Draw a single ground sprite.
function draw_ground(
  ctx: CanvasRenderingContext2D,
  id: Type.Sprite,
  sx: number,
  sy: number
): void {
  draw_sprite(ctx, id, sx, sy, tile_sz);
}

// Draw a single entity sprite.
function draw_entity(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  sx: number,
  sy: number,
  dir: Type.Dir,
  frame: number
): void {
  const key = entity_sprite_id(sprite, dir, frame);
  draw_sprite(ctx, key, sx, sy, tile_sz);
}

// Build a sprite id for an entity.
function entity_sprite_id(
  sprite: string,
  dir: Type.Dir,
  frame: number
): Type.Sprite {
  if (sprite.startsWith("icon_")) {
    return sprite;
  }
  if (sprite.startsWith("tile_")) {
    return sprite;
  }
  if (!sprite.startsWith("ent_")) {
    return SpriteType.id(sprite, frame, dir_idx[dir]);
  }
  let dir_name = "front";
  if (dir === "UP") {
    dir_name = "back";
  }
  if (dir === "LF" || dir === "UL" || dir === "DL") {
    dir_name = "left";
  }
  if (dir === "RG" || dir === "UR" || dir === "DR") {
    dir_name = "right";
  }
  const step = frame !== 0;
  let suffix = "stand";
  if (dir_name === "left" || dir_name === "right") {
    if (frame === 2) {
      suffix = "step";
    }
  } else if (step) {
    if (frame === 1) {
      suffix = "step0";
    } else {
      suffix = "step1";
    }
  }
  return `${sprite}_${dir_name}_${suffix}`;
}

// Draw a font sprite at a grid cell.
function draw_font(
  ctx: CanvasRenderingContext2D,
  id: Type.Sprite,
  x: number,
  y: number
): void {
  draw_sprite(ctx, id, x, y, font_sz);
}

// Draw a grid of font sprites.
function draw_font_grid(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number
): void {
  draw_font_grid_size(ctx, lines, x, y, font_sz);
}

// Draw a grid of font sprites with a specific glyph size.
function draw_font_grid_size(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  size: number
): void {
  for (let gy = 0; gy < lines.length; gy++) {
    const line = lines[gy];
    for (let gx = 0; gx < line.length; gx++) {
      const ch = line[gx];
      let id = Sprite.letter_to_sprite[ch];
      if (!id) {
        id = Sprite.fallback_sprite;
      }
      const sx = x + gx * size;
      const sy = y + gy * size;
      draw_sprite(ctx, id, sx, sy, size);
    }
  }
}

// Draw a prebuilt box grid at a position.
function draw_box_lines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number
): void {
  draw_font_grid(ctx, lines, x, y);
}

// Pad or trim text to a fixed width on the right.
function ready_text_pad_right(text: string, width: number): string {
  return text.slice(0, width).padEnd(width, " ");
}

// Center text in a fixed width.
function ready_text_center(text: string, width: number): string {
  const value = text.slice(0, width);
  const total = width - value.length;
  if (total <= 0) {
    return value;
  }
  const left = Math.ceil(total / 2);
  const right = total - left;
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}

// Build the lines for the top-right ready panel.
function ready_panel_lines(shared: Type.State): string[] {
  const ready = Players.ready_total(shared);
  const label = ready_text_pad_right(
    `Ready${ready}/${Players.max_players}`,
    ready_panel_cols - 2
  );
  return [
    "┌────────┐",
    `│${label}│`,
    "└────────┘"
  ];
}

// Draw the ready panel in the top-right corner.
function draw_ready_panel(
  ctx: CanvasRenderingContext2D,
  shared: Type.State
): void {
  draw_box_lines(ctx, ready_panel_lines(shared), ready_panel_x, ready_panel_y);
}

// Build the lines for the bottom-center ready button.
function ready_button_lines(shared: Type.State): string[] {
  let text = "Ready";
  if (shared.game_started) {
    text = "Start!";
  }
  const label = ready_text_center(text, ready_button_cols - 2);
  return [
    "┌──────┐",
    `│${label}|`,
    "└──────┘"
  ];
}

// Draw the ready button in the bottom-center.
function draw_ready_button(
  ctx: CanvasRenderingContext2D,
  shared: Type.State
): void {
  draw_box_lines(ctx, ready_button_lines(shared), ready_button_x, ready_button_y);
}

// Draw the start countdown number in the center of the screen.
function draw_start_countdown(
  ctx: CanvasRenderingContext2D,
  shared: Type.State
): void {
  if (!Players.game_countdown_visible(shared)) {
    return;
  }
  const value = `${Players.game_countdown_value(shared)}`;
  const text_w = value.length * countdown_font_sz;
  const text_h = countdown_font_sz;
  const x = Math.floor((ctx.canvas.width - text_w) * 0.5);
  const y = Math.floor((ctx.canvas.height - text_h) * 0.5);

  ctx.fillStyle = "rgba(253, 246, 234, 0.9)";
  ctx.fillRect(
    x - countdown_bg_pad,
    y - countdown_bg_pad,
    text_w + countdown_bg_pad * 2,
    text_h + countdown_bg_pad * 2
  );

  draw_font_grid_size(ctx, [value], x, y, countdown_font_sz);
}

// Build winner overlay lines with menu-style borders.
function winner_box_lines(shared: Type.State): string[] {
  const winner = shared.winner_name || "Player";
  const title = ready_text_center("The winner is", winner_box_cols - 2);
  const name = ready_text_center(winner, winner_box_cols - 2);
  return [
    "┌────────────────┐",
    `│${title}│`,
    `│${name}│`,
    "└────────────────┘"
  ];
}

// Draw a centered winner overlay when the match is finished.
function draw_winner_overlay(
  ctx: CanvasRenderingContext2D,
  shared: Type.State
): void {
  if (!shared.winner_name) {
    return;
  }
  const lines = winner_box_lines(shared);
  const cols = winner_box_cols;
  const rows = lines.length;
  const w = cols * font_sz;
  const h = rows * font_sz;
  const x = Math.floor((ctx.canvas.width - w) * 0.5);
  const y = Math.floor((ctx.canvas.height - h) * 0.5);
  draw_box_lines(ctx, lines, x, y);
}

// Return the ready button rectangle in canvas pixels.
export function ready_button_rect(): { x: number; y: number; w: number; h: number } {
  return {
    x: ready_button_x,
    y: ready_button_y,
    w: ready_button_cols * font_sz,
    h: ready_button_rows * font_sz
  };
}

// Draw a dialog box within a specific rectangle.
function draw_dialog_box(
  ctx: CanvasRenderingContext2D,
  dialog_state: Type.Dialog,
  tick: number,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const cols = Math.floor(w / font_sz);
  const rows = Math.floor(h / font_sz);
  const lines = Terminal.dialog_text(dialog_state, tick, cols, rows);
  draw_box_lines(ctx, lines, x, y);
}

// Build a list of hp bar tile fills for a ratio.
function battle_hp_tiles(ratio: number): number[] {
  return Terminal.bar_fill_levels(ratio);
}

// Write hp bar tiles into a map for a battle side.
function battle_hp_write(
  map: Record<string, string>,
  battle: Type.Battle,
  tick: number,
  side: Type.BattleSide,
  start_x: number,
  row: number
): void {
  const ratio = Terminal.battle_hp_ratio(battle, side, tick);
  const tiles = battle_hp_tiles(ratio);
  for (let i = 0; i < tiles.length; i++) {
    map[`${start_x + i},${row}`] = `hpbar_${tiles[i]}`;
  }
}

// Build a map of hp bar tiles for the battle grid.
function battle_hp_map(
  battle: Type.Battle,
  tick: number
): Record<string, string> {
  const map: Record<string, string> = {};

  battle_hp_write(map, battle, tick, "enemy", 4, 2);
  battle_hp_write(map, battle, tick, "player", 12, 9);

  return map;
}

// Draw a single hp bar row using hpbar font sprites.
function battle_draw_hp_row(
  ctx: CanvasRenderingContext2D,
  ratio: number,
  start_x: number,
  row: number
): void {
  const tiles = battle_hp_tiles(ratio);
  for (let i = 0; i < tiles.length; i++) {
    const sx = (start_x + i) * font_sz;
    const sy = row * font_sz;
    draw_font(ctx, `hpbar_${tiles[i]}`, sx, sy);
  }
}

// Draw extra overlays for a party picker screen.
function party_draw_mon_panel(
  ctx: CanvasRenderingContext2D,
  party: Type.Creature[]
): void {
  const total = Creature.party_total(party);
  for (let i = 0; i < total; i++) {
    const mon = party[i];
    if (!mon) {
      continue;
    }
    const row = i * 2;
    const icon_x = font_sz;
    const icon_y = row * font_sz;
    const icon_size = font_sz * 2;
    draw_sprite(ctx, "icon_bird", icon_x, icon_y, icon_size);

    let ratio = 0;
    if (mon.mhp > 0) {
      ratio = mon.chp / mon.mhp;
    }
    battle_draw_hp_row(ctx, ratio, 6, row + 1);
  }
}

// Decide whether to hide a battle sprite on a flicker tick.
function battle_sprite_hide(
  battle: Type.Battle,
  side: Type.BattleSide
): boolean {
  if (side !== "enemy") {
    return false;
  }
  if (battle.phase !== "run") {
    return false;
  }
  const capture = battle.capture;
  if (capture) {
    if (capture.success) {
      return true;
    }
  }
  return false;
}

// Compute the current frame for a battle anim.
function battle_anim_frame(anim: Type.BattleAnim, tick: number): number {
  const elapsed = tick - anim.start_tick;
  if (elapsed <= 0) {
    return 0;
  }
  const ratio = Util.clamp(elapsed / anim.duration, 0, 0.999);
  if (ratio < 0.5) {
    return 0;
  }
  return 1;
}

// Draw a battle animation sprite.
function battle_draw_anim(
  ctx: CanvasRenderingContext2D,
  anim: Type.BattleAnim,
  tick: number,
  rect: { x: number; y: number; w: number; h: number },
  y_off: number
): void {
  const size = font_sz * 2;
  const rect_w = rect.w * font_sz;
  const rect_h = rect.h * font_sz;
  const px = rect.x * font_sz + Math.floor((rect_w - size) / 2);
  const py = rect.y * font_sz + Math.floor((rect_h - size) / 2) + y_off;
  const frame = battle_anim_frame(anim, tick);

  if (anim.kind === "heal") {
    const id = `atk_fire_move_${frame}_00_00`;
    const image = Image.get(id);
    if (Image.ready(image)) {
      ctx.drawImage(image, px, py, size, size);
    }
    return;
  }

  for (let y = 0; y < 2; y++) {
    for (let x = 0; x < 2; x++) {
      const id = SpriteType.id(`atk_smog_${frame}`, x, y);
      const image = Image.get(id);
      if (!Image.ready(image)) {
        continue;
      }
      const dx = px + x * font_sz;
      const dy = py + y * font_sz;
      ctx.drawImage(image, dx, dy, font_sz, font_sz);
    }
  }
}

// Pick the frame for the capture ball sprite.
function battle_capture_frame(tick: number): number {
  const frame = Math.floor(tick / 8) % 2;
  if (frame === 0) {
    return 0;
  }
  return 1;
}

// Draw the capture ball between player and enemy.
function battle_draw_capture(
  ctx: CanvasRenderingContext2D,
  battle: Type.Battle,
  tick: number,
  player_rect: { x: number; y: number; w: number; h: number },
  enemy_rect: { x: number; y: number; w: number; h: number }
): void {
  const capture = battle.capture;
  if (!capture) {
    return;
  }

  const size = font_sz * 2;
  const from_x = (player_rect.x + player_rect.w * 0.5) * font_sz;
  const from_y = (player_rect.y + player_rect.h * 0.5) * font_sz + font_sz;
  const to_x = (enemy_rect.x + enemy_rect.w * 0.5) * font_sz;
  const to_y = (enemy_rect.y + enemy_rect.h * 0.5) * font_sz;

  let px = Math.floor(to_x - size / 2);
  let py = Math.floor(to_y - size / 2);

  if (battle.phase === "capture_throw") {
    const ratio = Util.clamp(
      (tick - capture.start_tick) / Const.tick_rate,
      0,
      1
    );
    const curve = 4 * ratio * (1 - ratio);
    const arc_h = 24;
    const x = from_x + (to_x - from_x) * ratio;
    const y = from_y + (to_y - from_y) * ratio - curve * arc_h;
    px = Math.floor(x - size / 2);
    py = Math.floor(y - size / 2);
  } else if (battle.phase === "capture_result") {
    const elapsed = tick - capture.start_tick;
    const wobble = Math.sin(elapsed / 4) * 3;
    px = Math.floor(to_x - size / 2 + wobble);
    py = Math.floor(to_y - size / 2);
  }

  const frame = battle_capture_frame(tick);
  const id = `atk_fire_move_${frame}_00_00`;
  const image = Image.get(id);
  if (Image.ready(image)) {
    ctx.drawImage(image, px, py, size, size);
  }
}

// Draw a battle sprite or fallback square.
function battle_draw_sprite(
  ctx: CanvasRenderingContext2D,
  id: Type.Sprite,
  color: string,
  rect: { x: number; y: number; w: number; h: number },
  y_off: number
): void {
  const px = rect.x * font_sz;
  const py = rect.y * font_sz + y_off;
  const w = rect.w * font_sz;
  const h = rect.h * font_sz;
  const image = Image.get(id);
  if (Image.ready(image)) {
    ctx.drawImage(image, px, py, w, h);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(px, py, w, h);
}

// Build a sprite id for a battle mon.
function battle_mon_sprite_id(
  specie_id: Type.Specie,
  side: Type.BattleSide
): Type.Sprite {
  const base = Monster.by_id[specie_id].sprite;
  if (side === "enemy") {
    return `mon_front_${base}_0`;
  }
  return `mon_back_${base}_0`;
}

// Draw the battle screen.
function draw_battle(
  ctx: CanvasRenderingContext2D,
  st: { shared: Type.State; player: Type.PlayerState },
  tick: number
): void {
  const battle = st.player.battle;
  if (!battle) {
    return;
  }

  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const lines = Terminal.battle_text(st, tick, false);
  if (lines.length === 0) {
    return;
  }

  let hp_map: Record<string, string> = {};
  if (battle.phase !== "mon") {
    hp_map = battle_hp_map(battle, tick);
  }

  for (let gy = 0; gy < lines.length; gy++) {
    const line = lines[gy];
    for (let gx = 0; gx < line.length; gx++) {
      const key = `${gx},${gy}`;
      const hp_id = hp_map[key];
      const sx = gx * font_sz;
      const sy = gy * font_sz;
      if (hp_id) {
        draw_font(ctx, hp_id, sx, sy);
        continue;
      }
      let ch = line[gx];
      if (ch === "#" || ch === "%") {
        ch = " ";
      }
      if (ch === "'") {
        let arrow = ">";
        if (gx < Math.floor(line.length / 2)) {
          arrow = "<";
        }
        let id = Sprite.letter_to_sprite[arrow];
        if (!id) {
          id = Sprite.fallback_sprite;
        }
        draw_font(ctx, id, sx, sy);
        continue;
      }
      let id = Sprite.letter_to_sprite[ch];
      if (!id) {
        id = Sprite.fallback_sprite;
      }
      draw_font(ctx, id, sx, sy);
    }
  }

  if (battle.phase === "mon") {
    party_draw_mon_panel(ctx, battle.party);
    return;
  }

  const enemy_rect = Terminal.battle_rect(lines, "%");
  const player_rect = Terminal.battle_rect(lines, "#");

  const enemy_id = battle_mon_sprite_id(battle.enemy.specie_id, "enemy");
  const player_id = battle_mon_sprite_id(battle.player.specie_id, "player");

  if (enemy_rect && !battle_sprite_hide(battle, "enemy")) {
    battle_draw_sprite(ctx, enemy_id, battle.enemy.color, enemy_rect, 0);
  }
  if (player_rect && !battle_sprite_hide(battle, "player")) {
    const player_off = font_sz;
    const player_color = battle.player.color;
    battle_draw_sprite(ctx, player_id, player_color, player_rect, player_off);
  }

  if (battle.anim) {
    const anim = battle.anim;
    let rect = player_rect;
    if (anim.side === "enemy") {
      rect = enemy_rect;
    }
    if (rect) {
      let y_off = 0;
      if (anim.side === "player") {
        y_off = font_sz;
      }
      battle_draw_anim(ctx, anim, tick, rect, y_off);
    }
  }

  if (player_rect && enemy_rect) {
    if (battle.phase === "capture_throw" || battle.phase === "capture_result") {
      battle_draw_capture(ctx, battle, tick, player_rect, enemy_rect);
    }
  }
}

// Draw the start-menu full-screen party picker.
function draw_party_picker(
  ctx: CanvasRenderingContext2D,
  st: { shared: Type.State; player: Type.PlayerState },
  menu: Type.Menu
): void {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const entity = Map.entity_at(st.shared.map, st.player.player_pos);
  let party: Type.Creature[] = [];
  if (entity) {
    party = entity.party;
  }

  const lines = Terminal.party_picker_text(party, menu.mon_index);
  draw_font_grid(ctx, lines, 0, 0);
  party_draw_mon_panel(ctx, party);
}

// Render the full frame.
export function on_draw(
  ctx: CanvasRenderingContext2D,
  st: { shared: Type.State; player: Type.PlayerState },
  tick: number
): void {
  const menu = st.player.menu;
  if (menu && menu.mode === "party") {
    draw_party_picker(ctx, st, menu);
    return;
  }

  if (st.player.battle) {
    draw_battle(ctx, st, tick);
    return;
  }

  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const map = st.shared.map;
  const player_tile = st.player.player_pos;
  const player_data = Map.get(map, player_tile);
  let player_pos = player_tile;
  if (player_data && player_data.entity) {
    player_pos = Entity.pos(player_data.entity, tick);
  }

  const off_x = view_focus_x * tile_sz - player_pos.x * tile_sz;
  const off_y = view_focus_y * tile_sz - player_pos.y * tile_sz;
  const draw_cols = view_cols + view_pad * 2;
  const draw_rows = view_rows + view_pad * 2;
  const start_x = player_tile.x - view_focus_x - view_pad;
  const start_y = player_tile.y - view_focus_y - view_pad;

  const entities: Type.Entity[] = [];

  for (let y = 0; y < draw_rows; y++) {
    for (let x = 0; x < draw_cols; x++) {
      const wx = start_x + x;
      const wy = start_y + y;
      const pos_xy = Pos.create(wx, wy);
      const tile = Map.get(map, pos_xy);
      let ground_id = "tile_grass_00_00";
      if (tile) {
        ground_id = tile.ground;
        if (tile.entity) {
          entities.push(tile.entity);
        }
      }
      const sx = wx * tile_sz + off_x;
      const sy = wy * tile_sz + off_y;
      draw_ground(ctx, ground_id, sx, sy);
    }
  }

  for (const entity of entities) {
    if (entity.sprite === "wall") {
      continue;
    }
    const pos_xy = Entity.pos(entity, tick);
    const sx = pos_xy.x * tile_sz + off_x;
    const sy = pos_xy.y * tile_sz + off_y;
    let frame = 0;
    const elapsed = tick - entity.last_tick;
    if (elapsed > 0 && elapsed < Const.move_ticks) {
      const step = Math.floor((elapsed / Const.move_ticks) * 2);
      frame = step + 1;
    }
    draw_entity(ctx, entity.sprite, sx, sy, entity.direction, frame);
  }

  if (!st.shared.game_started) {
    draw_ready_panel(ctx, st.shared);
  }

  const dialog_state = st.player.dialog;
  if (dialog_state) {
    const dialog_h = tile_sz * 3;
    const dialog_y = canvas.height - dialog_h;
    const dialog_w = canvas.width;
    draw_dialog_box(ctx, dialog_state, tick, 0, dialog_y, dialog_w, dialog_h);
  }

  if (menu && menu.mode === "start") {
    const menu_x = 5 * tile_sz;
    const menu_y = 0;
    const lines = Terminal.menu_text(menu);
    draw_box_lines(ctx, lines, menu_x, menu_y);
  }

  if (!st.shared.game_started) {
    draw_ready_button(ctx, st.shared);
  }

  draw_start_countdown(ctx, st.shared);
  draw_winner_overlay(ctx, st.shared);
}
