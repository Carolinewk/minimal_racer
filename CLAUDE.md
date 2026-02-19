# AGENTS.md

## Repo summary
Vibimon is a retro monster‑catcher prototype built with Bun, TypeScript,
HTML5, and a pixel canvas. The game state is immutable and updated by
pure functions. Rendering uses a 160x160 canvas scaled to 320x320 via
CSS.

## How to run
- Build: `bun run build`
- Dev server: `bun run server`
- URL: `http://localhost:4001`

## Architecture overview
- `src/Client.ts` is the browser entrypoint (input + frame loop).
- `src/Server.ts` serves static files from `public/`.
- `src/game/` holds all game logic and rendering helpers.

## Directory map
- `src/Client.ts` - browser entry, input + frame loop.
- `src/Server.ts` - Bun static server.
- `src/game/Type.ts` - types (Pos, Tile, Entity, State, etc).
- `src/game/Const.ts` - constants (sizes, tick_rate, move_*).
- `src/game/Util.ts` - clamp + tick_now.
- `src/game/Game.ts` - state entrypoints (state_init/on_tick/on_post).
- `src/game/State.ts` - core state helpers (state_*).
- `src/game/Render/Image.ts` - canvas draw_floor, draw_ent, on_draw.
- `src/game/Render/Text.ts` - terminal on_draw_raw + text grids.
- `src/game/Type/Map.ts` - map helpers (Immutable.js Map).
- `src/game/Type/Pos.ts` - position helpers + direction conversion.
- `src/game/Type/Tile.ts` - tile helpers.
- `src/game/Type/Entity.ts` - entity helpers.
- `src/game/Type/Mon.ts` - mon helpers.
- `src/game/Type/Battle.ts` - battle helpers.
- `src/game/Type/Dialog.ts` - dialog helpers.
- `src/game/Type/Image.ts` - sprite cache + preload helpers.
- `src/game/Type/Specie.ts` - specie helpers.
- `src/game/State/Battle.ts` - battle state transitions (state_battle_*).
- `src/game/State/Dialog.ts` - dialog state transitions (state_dialog_*).
- `src/game/State/Menu.ts` - menu state transitions (state_menu_*).
- `src/game/Map/Build.ts` - map mechanics: parsing, insert_map_string.
- `src/game/Map/World.ts` - init_world wiring (uses World + Glyph).
- `src/data/Sprite.ts` - sprite_to_glyph + letter_to_sprite.
- `src/data/` - data-only tables (Glyph, World, Menu, Move, Specie).
- `assets/` - sprites (PNG).
- `public/` - built output (HTML/CSS/JS).

## Core data model
- `Map` is `Immutable.Map<string, Tile>` keyed by "x,y".
- `Tile` is `{ floor, entity, on_walk }`.
- `Entity` includes position, direction, last_tick, party, dialog, keys.
- `DialogText` is `string[][]` (paragraphs -> lines).

## Map system rules
- `game/Map/World.ts` wires `init_world` (map strings in `src/data/World.ts`).
- `Build.ts` has mechanics: `insert_map_string`, `on_walk_teleport`.
- `data/Glyph.ts` exports `glypth` token map (building/bordered/entity/marker).
- World map strings use 2 lines per tile row: entity line then floor line.
- Each tile is 4 chars wide with a 2-char glyph centered: ` EE ` / ` FF `.
- Floor glyphs: `HH` house, `TT` tree, `^^` bush, `BB` bird, `MM` mountain,
  `DD` door, `##` bricks, `::` empty.
- Entity glyphs: `PP` player, `  ` empty.
- Buildings must be full blocks or throw an error.

## Autotiling (bordered sprites)
- Bordered floors use 13-tile autotiling (8 neighbors checked).
- Suffixes: `center`, `edge_top/bot/lft/rgt`, `outer_top_lft/rgt`,
  `outer_bot_lft/rgt`, `inner_top_lft/rgt`, `inner_bot_lft/rgt`.
- Outer corners: two adjacent cardinals missing (convex).
- Inner corners: all cardinals present, one diagonal missing (concave).
- Assets named `<name>_<suffix>.png` (e.g., `cave_edge_top.png`).

## Rendering rules
- Draw ground then floor; entities on top.
- Entity sprites are 4x4 sheets (frame, direction).
- Dialog box is 3 tiles tall at the bottom of the screen.
- Menu is right half of the screen with 7 items.

## Input rules
- WASD moves the player (subject to move cooldown).
- J opens dialog when facing a dialog source; J advances dialog.
- L opens the menu; K closes it.

## Coding conventions (strict)
- Types are CamelCase; values and functions are snake_case.
- Every function must have a `//` comment line above it.
- No ternary operators. No single‑line if statements.
- No type aliases; always write `Type.Pos`, never `type P = Type.Pos`.
- Keep lines <= 80 chars. Short, clear names are required.
- Avoid multi‑line calls/objects when possible, but never exceed 80.
- Align `=` groups when it improves readability.
- Prefer `up/dw/lf/rg` for adjacency flags (not north/south/etc).
- State handlers start with `state_`.
- Type helper functions start with the type name prefix (pos_, tile_, mon_).

## Import conventions (strict)
- Always use namespace imports: `import * as Foo from "./Foo"`.
- Do not use named imports or default imports.
- Keep aliases matching the file name (e.g., Map, Pos, Tile).

## Organization rules (strict)
- Files are named after the type they serve.
- Functions that operate on a type live in that type's file
  (`src/game/Type/TypeName.ts`).
- When a function receives multiple types, place it in the most
  semantically specific type's file (e.g., Tile > Pos).
- `Type.ts` is the central type definitions file.
- `Game.ts` handles live state entrypoints (state_init/on_tick/on_post).
- `State.ts` holds core state helpers; `State/*` holds state transitions.
- `data/World.ts` defines map data; `game/Map/World.ts` wires teleports.
- `Build.ts` has map mechanics (parsing, teleport creation).
- Keep helpers small and composable; avoid monolithic functions.
- No redundant helpers that only wrap a trivial expression.

## State rules (strict)
- State updates are immutable (never mutate input state).
- `state_on_tick` and `state_on_post` are pure and deterministic.
- Use `Map.map_get` / `Map.map_set` for map access.

## Notes
- `move_cooldown` and `move_ticks` are both 16 (4 tiles/sec).
- Map strings live in `src/data/World.ts`.
