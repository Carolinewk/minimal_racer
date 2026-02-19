import * as Menu from "../../data/Menu";
import * as Move from "../../data/Move";
import * as Sprite from "../../data/Sprite";
import * as Const from "../Const";
import * as Battle from "../Type/Battle";
import * as Creature from "../Type/Creature";
import * as Dialog from "../Type/Dialog";
import * as Map from "../Type/Map";
import * as Pos from "../Type/Pos";
import * as Util from "../Util";
import * as Type from "../Type";

const view_cols = Const.view_cols;
const view_rows = Const.view_rows;
const view_focus_x = 4;
const view_focus_y = 4;

const empty_ground_glyph = "___";
const empty_entity_glyph = "   ";

// Return the glyph for a sprite id.
function glyph_asset(id: string): string {
  const glyph = Sprite.sprite_to_glyph[id];
  if (glyph) {
    return glyph;
  }
  return "???";
}

// Return the glyph for a ground sprite id.
function ground_sprite(id: string): string {
  const glyph = Sprite.sprite_to_glyph[id];
  if (glyph) {
    return glyph;
  }
  return empty_ground_glyph;
}

// Return the glyph for an entity sprite.
function glyph_entity(entity: Type.Entity): string {
  let id = entity.sprite;
  if (entity.sprite.startsWith("ent_")) {
    id = entity.sprite + "_front_stand";
  }
  const glyph = Sprite.sprite_to_glyph[id];
  if (glyph) {
    return glyph;
  }
  return "???";
}

// Return the empty glyph.
function glyph_empty(): string {
  return empty_entity_glyph;
}

// Build a bordered character grid.
function box_grid(cols: number, rows: number): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: string[] = [];
    for (let x = 0; x < cols; x++) {
      let ch = " ";
      if (y === 0 && x === 0) {
        ch = "┌";
      } else if (y === 0 && x === cols - 1) {
        ch = "┐";
      } else if (y === rows - 1 && x === 0) {
        ch = "└";
      } else if (y === rows - 1 && x === cols - 1) {
        ch = "┘";
      } else if (y === 0 || y === rows - 1) {
        ch = "─";
      } else if (x === 0) {
        ch = "│";
      } else if (x === cols - 1) {
        ch = "|";
      }
      row.push(ch);
    }
    grid.push(row);
  }
  return grid;
}

// Write a line into a grid row.
function grid_write(
  grid: string[][],
  row: number,
  col: number,
  text: string,
  max: number
): void {
  const line = grid[row];
  if (!line) {
    return;
  }
  const limit = Math.min(max, line.length - col);
  if (limit <= 0) {
    return;
  }
  let slice = text;
  if (slice.length > limit) {
    slice = slice.slice(0, limit);
  }
  for (let i = 0; i < slice.length; i++) {
    line[col + i] = slice[i];
  }
}

// Join grid rows into string lines.
function grid_lines(grid: string[][]): string[] {
  const lines: string[] = [];
  for (let y = 0; y < grid.length; y++) {
    lines.push(grid[y].join(""));
  }
  return lines;
}

// Build a grid from string lines.
function grid_from_lines(lines: string[]): string[][] {
  const grid: string[][] = [];
  for (let i = 0; i < lines.length; i++) {
    grid.push(lines[i].split(""));
  }
  return grid;
}

// Build an empty grid filled with spaces.
function grid_blank(cols: number, rows: number): string[][] {
  const grid: string[][] = [];
  for (let y = 0; y < rows; y++) {
    const row: string[] = [];
    for (let x = 0; x < cols; x++) {
      row.push(" ");
    }
    grid.push(row);
  }
  return grid;
}

// Insert string lines into a grid at a start row.
function grid_put_lines(
  grid: string[][],
  start_y: number,
  lines: string[]
): void {
  for (let i = 0; i < lines.length; i++) {
    grid[start_y + i] = lines[i].split("");
  }
}

// Overlay lines into a grid and return joined lines.
function grid_overlay(
  grid: string[][],
  start_y: number,
  lines: string[]
): string[] {
  grid_put_lines(grid, start_y, lines);
  return grid_lines(grid);
}

// Build a dialog grid with two lines of text.
function dialog_grid_text(
  top: string,
  bot: string,
  cols: number,
  rows: number
): string[] {
  const grid = box_grid(cols, rows);
  const start_x = 1;
  const max = cols - 2;
  const row_top = 2;
  const last_inner = rows - 2;
  if (row_top > last_inner) {
    return grid_lines(grid);
  }
  const row_bot = Math.min(4, last_inner);

  grid_write(grid, row_top, start_x, top, max);
  grid_write(grid, row_bot, start_x, bot, max);

  return grid_lines(grid);
}

// Build the dialog grid text for this tick.
export function dialog_text(
  dialog_state: Type.Dialog,
  tick: number,
  cols: number,
  rows: number
): string[] {
  const view = Dialog.view(dialog_state, tick);
  const top = view.top_ln.slice(0, view.top_seen);
  const bot = view.bot_ln.slice(0, view.bot_seen);
  return dialog_grid_text(top, bot, cols, rows);
}

// Build a full dialog grid text from a dialog.
function dialog_text_full(
  dialog: Type.DialogText,
  cols: number,
  rows: number
): string[] {
  const para = dialog[0] || [];
  const top  = para[0] || "";
  const bot  = para[1] || "";
  return dialog_grid_text(top, bot, cols, rows);
}

// Build the start menu grid text.
export function menu_text(menu: Type.Menu): string[] {
  const cols = 10;
  const rows = 16;
  const grid = box_grid(cols, rows);
  const start_x = 2;
  const max = 7;
  const start_y = 2;
  const gap = 2;

  for (let i = 0; i < Menu.items.length; i++) {
    const row = start_y + i * gap;
    if (row >= rows - 1) {
      continue;
    }
    grid_write(grid, row, start_x, Menu.items[i], max);
  }

  const sel = menu.selected_index;
  if (sel >= 0 && sel < Menu.items.length) {
    const row = start_y + sel * gap;
    if (row < rows - 1) {
      grid_write(grid, row, 1, "▶", 1);
    }
  }

  return grid_lines(grid);
}

// Pad or trim text to a fixed width on the right.
function text_pad_right(text: string, width: number): string {
  return text.slice(0, width).padEnd(width, " ");
}

// Pad text on the left to a minimum width.
function text_pad_left(text: string, width: number): string {
  return text.padStart(width, " ");
}

// Build a fixed width battle name.
function battle_name_text(name: string, max: number): string {
  return text_pad_right(name, max);
}

// Build a fixed width battle level string.
function battle_level_text(lvl: number): string {
  return text_pad_right(`L${lvl}`, 4);
}

// Build a fixed width selector level string.
function battle_pick_level_text(lvl: number): string {
  const value = text_pad_left(`${lvl}`, 3);
  return text_pad_right(`LV${value}`, 5);
}

// Build a fixed width battle HP string.
function battle_hp_text(curr: number, max: number): string {
  const left = text_pad_left(`${curr}`, 3);
  const right = text_pad_left(`${max}`, 3);
  return `${left}/${right}`;
}

// Build the top panel text for a party picker.
function party_picker_top_text(
  party: Type.Creature[],
  mon_index: number
): string[] {
  const cols = 20;
  const rows = 12;
  const grid = grid_blank(cols, rows);
  const total = Creature.party_total(party);

  for (let i = 0; i < total; i++) {
    const mon = party[i];
    if (!mon) {
      continue;
    }
    const row = i * 2;
    if (mon_index === i) {
      grid_write(grid, row, 0, "▶", 1);
    }
    const name = battle_name_text(mon.nick, 10);
    const level = battle_pick_level_text(mon.lvl);
    const hp = battle_hp_text(mon.chp, mon.mhp);
    grid_write(grid, row, 3, name, 10);
    grid_write(grid, row, 13, level, 5);
    if (row + 1 < rows) {
      grid_write(grid, row + 1, 4, "HP:", 3);
      grid_write(grid, row + 1, 13, hp, 7);
    }
  }

  return grid_lines(grid);
}

// Build the full party picker text with a fixed hint dialog.
export function party_picker_text(
  party: Type.Creature[],
  mon_index: number
): string[] {
  const top = party_picker_top_text(party, mon_index);
  const hint: Type.DialogText = [["Choose a MON."]];
  const bot = dialog_text_full(hint, 20, 6);
  return [...top, ...bot];
}

// Build the battle moves grid text.
function battle_moves_text(battle: Type.Battle): string[] {
  const cols = 20;
  const rows = 6;
  const grid = box_grid(cols, rows);
  const moves = battle.player.moves;
  const max = cols - 3;

  for (let i = 0; i < moves.length && i < 4; i++) {
    const move = Move.move_table[moves[i]];
    const row = 1 + i;
    grid_write(grid, row, 2, move.name, max);
  }

  const sel = battle.move_index;
  if (sel >= 0 && sel < 4) {
    const row = 1 + sel;
    if (row < rows - 1) {
      grid_write(grid, row, 1, "▶", 1);
    }
  }

  return grid_lines(grid);
}

// Build the battle screen text.
export function battle_text(
  st: { shared: Type.State; player: Type.PlayerState },
  tick: number,
  instant: boolean
): string[] {
  const battle = st.player.battle;
  if (!battle) {
    return [];
  }

  if (battle.phase === "mon") {
    const top = party_picker_top_text(battle.party, battle.mon_index);
    if (st.player.dialog) {
      const bot = dialog_text(st.player.dialog, tick, 20, 6);
      return [...top, ...bot];
    }
    const hint: Type.DialogText = [["Choose a MON."]];
    const bot = dialog_text_full(hint, 20, 6);
    return [...top, ...bot];
  }

  const layout = [
    " ABCDEFGHIJ %%%%%%% ",
    "    L999    %%%%%%% ",
    " │HP======  %%%%%%% ",
    " <────────> %%%%%%% ",
    " ########   %%%%%%% ",
    " ########   %%%%%%% ",
    " ########   %%%%%%% ",
    " ######## ABCDEFGHIJ",
    " ########     L999  ",
    " ######## HP======| ",
    " ########  999/999| ",
    " ########<────────> ",
    "┌───────┌──────────┐",
    "│       │          │",
    "│       │▶FIGHT MON│",
    "│       │          │",
    "│       │ ITEM  RUN│",
    "└───────└──────────┘"
  ];

  const grid = grid_from_lines(layout);

  const enemy_name = battle_name_text(battle.enemy.nick, 10);
  const enemy_level = battle_level_text(battle.enemy.lvl);
  grid_write(grid, 0, 1, enemy_name, 10);
  grid_write(grid, 1, 4, enemy_level, 4);

  const player_name = battle_name_text(battle.player.nick, 10);
  const player_level = battle_level_text(battle.player.lvl);
  grid_write(grid, 7, 10, player_name, 10);
  grid_write(grid, 8, 14, player_level, 4);

  let player_hp = battle.player.chp;
  if (!instant) {
    player_hp = battle_hp_value(battle, "player", tick);
  }
  const hp_text = battle_hp_text(player_hp, battle.player.mhp);
  grid_write(grid, 10, 11, hp_text, 7);

  if (st.player.dialog) {
    const lines = dialog_text(st.player.dialog, tick, 20, 6);
    return grid_overlay(grid, 12, lines);
  }

  if (battle.phase === "moves") {
    const lines = battle_moves_text(battle);
    return grid_overlay(grid, 12, lines);
  }

  if (battle.phase === "menu") {
    const base_x = 9;
    const base_y = 14;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const x = base_x + col * 6;
        const y = base_y + row * 2;
        grid[y][x] = " ";
      }
    }
    const sel_x = base_x + battle.menu.col * 6;
    const sel_y = base_y + battle.menu.row * 2;
    grid[sel_y][sel_x] = "▶";
    return grid_lines(grid);
  }

  if (battle.phase === "anim" || battle.phase === "hp") {
    const action = battle.actions[0];
    if (action) {
      const dialog = Battle.action_dialog(battle, action);
      const lines = dialog_text_full(dialog, 20, 6);
      return grid_overlay(grid, 12, lines);
    }
  }

  const blank = grid_lines(box_grid(20, 6));
  return grid_overlay(grid, 12, blank);
}

// Find the bounding rect for a battle sprite placeholder.
export function battle_rect(
  lines: string[],
  target: string
): { x: number; y: number; w: number; h: number } | null {
  let min_x = lines[0].length;
  let min_y = lines.length;
  let max_x = -1;
  let max_y = -1;

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      if (line[x] !== target) {
        continue;
      }
      if (x < min_x) {
        min_x = x;
      }
      if (y < min_y) {
        min_y = y;
      }
      if (x > max_x) {
        max_x = x;
      }
      if (y > max_y) {
        max_y = y;
      }
    }
  }

  if (max_x < 0 || max_y < 0) {
    return null;
  }

  return {
    x: min_x,
    y: min_y,
    w: max_x - min_x + 1,
    h: max_y - min_y + 1
  };
}

// Remove the top row of a battle placeholder.
function battle_trim_row(lines: string[], target: string): string[] {
  const rect = battle_rect(lines, target);
  if (!rect) {
    return lines;
  }
  const row = lines[rect.y];
  if (!row) {
    return lines;
  }
  const chars = row.split("");
  for (let x = rect.x; x < rect.x + rect.w; x++) {
    if (chars[x] === target) {
      chars[x] = " ";
    }
  }
  const next = [...lines];
  next[rect.y] = chars.join("");
  return next;
}

// Compute an animated HP value for a side.
function battle_hp_value(
  battle: Type.Battle,
  side: Type.BattleSide,
  tick: number
): number {
  const anim = battle.hp_anim;
  if (anim && anim.side === side) {
    const elapsed = tick - anim.start_tick;
    const ratio = Util.clamp(elapsed / anim.duration, 0, 1);
    const delta = anim.to - anim.from;
    return anim.from + Math.floor(delta * ratio);
  }
  const mon = Battle.creature_get(battle, side);
  return mon.chp;
}

// Compute an hp ratio for a battle side.
export function battle_hp_ratio(
  battle: Type.Battle,
  side: Type.BattleSide,
  tick: number
): number {
  const mon = Battle.creature_get(battle, side);
  if (mon.mhp <= 0) {
    return 0;
  }
  const hp = battle_hp_value(battle, side, tick);
  return hp / mon.mhp;
}

// Build fill values for a 6-tile ratio bar.
export function bar_fill_levels(ratio: number): number[] {
  const levels: number[] = [];
  const total = Math.floor(Util.clamp(ratio, 0, 1) * 48);
  for (let i = 0; i < 6; i++) {
    const fill = Util.clamp(total - i * 8, 0, 8);
    levels.push(fill);
  }
  return levels;
}

// Read the player party list from the current state.
function player_party(st: { shared: Type.State; player: Type.PlayerState }): Type.Creature[] {
  const entity = Map.entity_at(st.shared.map, st.player.player_pos);
  if (!entity) {
    return [];
  }
  return entity.party;
}

// Build the raw terminal grid for the map screen.
function map_raw_lines(st: { shared: Type.State; player: Type.PlayerState }, tick: number): string[] {
  let lines: string[] = [];
  const start_x = st.player.player_pos.x - view_focus_x;
  const start_y = st.player.player_pos.y - view_focus_y;
  const cell_w = 4;
  const line_w = view_cols * cell_w;

  for (let y = 0; y < view_rows; y++) {
    let entity_line = "";
    let ground_line = "";
    for (let x = 0; x < view_cols; x++) {
      const wx = start_x + x;
      const wy = start_y + y;
      const pos = Pos.create(wx, wy);
      const tile = Map.get(st.shared.map, pos);
      let ground_id = "tile_grass_00_00";
      if (tile) {
        ground_id = tile.ground;
      }
      const ground = ground_sprite(ground_id);
      let entity = glyph_empty();
      let dir: Type.Maybe<Type.Dir> = null;
      if (tile && tile.entity) {
        entity = glyph_entity(tile.entity);
        dir = tile.entity.direction;
      }
      if (Pos.equal(pos, st.player.player_pos)) {
        if (!tile || !tile.entity) {
          entity = glyph_asset("ent_red_front_stand");
        }
      }
      entity_line += raw_entity_cell(entity, dir);
      ground_line += raw_cell(ground);
    }
    lines.push(entity_line);
    lines.push(ground_line);
  }

  if (st.player.menu && st.player.menu.mode === "start") {
    const menu_lines = raw_expand_lines(menu_text(st.player.menu));
    const menu_x = 5 * cell_w;
    lines = raw_overlay_lines(lines, menu_lines, menu_x, 0, line_w);
  }

  if (st.player.dialog) {
    const dialog_lines = dialog_text(st.player.dialog, tick, 20, 6);
    const expanded = raw_expand_lines(dialog_lines);
    const start = lines.length - expanded.length;
    for (let i = 0; i < expanded.length; i++) {
      const row = start + i;
      if (row >= 0 && row < lines.length) {
        lines[row] = expanded[i];
      }
    }
  }

  return lines;
}

// Convert a direction into a raw terminal arrow.
function raw_dir_arrow(dir: Type.Dir): string {
  switch (dir) {
    case "UP":
    case "UL":
    case "UR":
      return "↑";
    case "DW":
    case "DL":
    case "DR":
      return "↓";
    case "LF":
      return "←";
    case "RG":
      return "→";
  }
}

// Build one raw entity cell from a glyph token and optional direction.
function raw_entity_cell(
  glyph: string,
  dir: Type.Maybe<Type.Dir>
): string {
  if (!dir) {
    return `${glyph}|`;
  }
  return `${glyph}${raw_dir_arrow(dir)}`;
}

// Build one raw map cell from a glyph token.
function raw_cell(glyph: string): string {
  return `${glyph}|`;
}

// Detect if a glyph should be treated as emoji width.
function raw_is_emoji_glyph(glyph: string): boolean {
  if (!glyph) {
    return false;
  }
  if (glyph.includes("\u200D") || glyph.includes("\uFE0F")) {
    return true;
  }
  const code = glyph.codePointAt(0);
  if (!code) {
    return false;
  }
  if (code >= 0x1f000) {
    return true;
  }
  return code >= 0x2600 && code <= 0x27bf;
}

// Return the display width of a glyph.
function raw_char_width(glyph: string): number {
  if (raw_is_emoji_glyph(glyph)) {
    return 2;
  }
  return 1;
}

// Convert a line into a display column buffer.
function raw_line_cols(line: string, width: number): (string | null)[] {
  const cols: (string | null)[] = new Array(width).fill(" ");
  let col = 0;
  for (const ch of line) {
    const w = raw_char_width(ch);
    if (col >= width) {
      break;
    }
    cols[col] = ch;
    if (w === 2 && col + 1 < width) {
      cols[col + 1] = null;
    }
    col += w;
  }
  return cols;
}

// Convert a display column buffer back into a line.
function raw_cols_line(cols: (string | null)[]): string {
  let out = "";
  for (const cell of cols) {
    if (cell === null) {
      continue;
    }
    out += cell;
  }
  return out;
}

// Overlay one line into another by display columns.
function raw_overlay_line(
  base: string,
  overlay: string,
  start_x: number,
  width: number
): string {
  const base_cols = raw_line_cols(base, width);
  const over_cols = raw_line_cols(overlay, width);
  for (let i = 0; i < width; i++) {
    const idx = start_x + i;
    if (idx < 0 || idx >= width) {
      continue;
    }
    const cell = over_cols[i];
    if (cell === null) {
      base_cols[idx] = null;
      continue;
    }
    base_cols[idx] = cell;
  }
  return raw_cols_line(base_cols);
}

// Overlay multiple lines by display columns.
function raw_overlay_lines(
  base: string[],
  overlay: string[],
  start_x: number,
  start_y: number,
  width: number
): string[] {
  const next = [...base];
  for (let y = 0; y < overlay.length; y++) {
    const row = start_y + y;
    if (row < 0 || row >= next.length) {
      continue;
    }
    next[row] = raw_overlay_line(next[row], overlay[y], start_x, width);
  }
  return next;
}

const raw_expand_map: Record<string, string> = {
  " ": "  ",
  "░": "  ",
  "▏": "▎ ",
  "▎": "▌ ",
  "▍": "▊ ",
  "▌": "█ ",
  "▋": "█▎",
  "▊": "█▌",
  "▉": "█▊",
  "█": "██",
  "#": "# ",
  "-": "--",
  "─": "──",
  "┌": "┌─",
  "┐": "─┐",
  "└": "└─",
  "┘": "─┘"
};

// Expand a battle line so every tile is 2 characters wide.
function raw_expand_line(line: string): string {
  let out = "";
  const chars = [...line];
  const last = chars.length - 1;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === "│" || ch === "|") {
      if (i === last) {
        out += " │";
      } else {
        out += "│ ";
      }
      continue;
    }
    const mapped = raw_expand_map[ch];
    if (mapped) {
      out += mapped;
      continue;
    }
    out += `${ch} `;
  }
  return out;
}

// Expand multiple lines to double width.
function raw_expand_lines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    out.push(raw_expand_line(lines[i]));
  }
  return out;
}

// Convert a bar ratio to placeholder tiles.
function raw_bar_tiles(ratio: number): string[] {
  const tiles: string[] = [];
  const glyphs = [
    "░",
    "▏",
    "▎",
    "▍",
    "▌",
    "▋",
    "▊",
    "▉",
    "█"
  ];
  const fills = bar_fill_levels(ratio);
  for (let i = 0; i < fills.length; i++) {
    tiles.push(glyphs[fills[i]]);
  }
  return tiles;
}

// Place a bar placeholder row into a battle line.
function raw_place_bar(
  lines: string[],
  row: number,
  col: number,
  ratio: number
): string[] {
  if (row < 0 || row >= lines.length) {
    return lines;
  }
  const tiles = raw_bar_tiles(ratio);
  const next = [...lines];
  const line = [...next[row]];
  for (let i = 0; i < tiles.length; i++) {
    const idx = col + i;
    if (idx >= 0 && idx < line.length) {
      line[idx] = tiles[i];
    }
  }
  next[row] = line.join("");
  return next;
}

// Place selector HP bars in a party picker screen.
function raw_place_party_bars(
  lines: string[],
  party: Type.Creature[]
): string[] {
  let next = lines;
  const total = Creature.party_total(party);
  for (let i = 0; i < total; i++) {
    const mon = party[i];
    if (!mon) {
      continue;
    }
    let ratio = 0;
    if (mon.mhp > 0) {
      ratio = mon.chp / mon.mhp;
    }
    const row = i * 2 + 1;
    next = raw_place_bar(next, row, 6, ratio);
  }
  return next;
}

// Build the raw terminal output for the current frame.
export function on_draw_raw(
  st: { shared: Type.State; player: Type.PlayerState },
  tick: number
): string {
  const menu = st.player.menu;
  if (menu && menu.mode === "party") {
    const party = player_party(st);
    let lines = party_picker_text(party, menu.mon_index);
    lines = raw_place_party_bars(lines, party);
    const wide = raw_expand_lines(lines);
    return wide.join("\n");
  }

  if (st.player.battle) {
    let lines = battle_text(st, tick, false);
    const battle = st.player.battle;
    if (!battle) {
      return "";
    }

    if (battle.phase === "mon") {
      lines = raw_place_party_bars(lines, battle.party);
      const wide = raw_expand_lines(lines);
      return wide.join("\n");
    }

    lines = battle_trim_row(lines, "#");

    const enemy_ratio = battle_hp_ratio(battle, "enemy", tick);
    const player_ratio = battle_hp_ratio(battle, "player", tick);
    lines = raw_place_bar(lines, 2, 4, enemy_ratio);
    lines = raw_place_bar(lines, 9, 12, player_ratio);
    const wide = raw_expand_lines(lines);
    return wide.join("\n");
  }
  return map_raw_lines(st, tick).join("\n");
}
