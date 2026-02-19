# AGENTS.md

## Repo summary
Vibimon is a retro monster-catcher prototype built with Bun, TypeScript,
HTML5, and a pixel canvas. Game state is immutable and updated by pure
functions.

## How to run
- Build: `bun run build`
- Dev server: `bun run server`
- URL: `http://localhost:4000`

## Architecture overview
- `src/Client.ts` is the browser entrypoint (input + frame loop).
- `src/Server.ts` serves static files from `public/`.
- `src/game/Game.ts` exposes game entrypoints (`create/on_tick/on_post`).
- `src/game/Type.ts` is the central type file (from small types to `State`).
- `src/game/Type/*` contains helpers grouped by type/domain.
- `src/game/Render/Screen.ts` renders image mode (`RenderMode.IMG`).
- `src/game/Render/Terminal.ts` renders raw terminal mode (`RenderMode.RAW`).
- `src/data/*` holds editable game data tables (glyph map, world, monsters,
  moves, sprites, menu).

## Directory map
- `src/Client.ts` - browser loop + keyboard input + rendering mode.
- `src/Server.ts` - Bun static server.
- `src/game/Const.ts` - constants (`tile_size`, move timings, sizes).
- `src/game/Util.ts` - generic helpers (`clamp`, `tick_now`).
- `src/game/Game.ts` - root game state transitions.
- `src/game/Render/Screen.ts` - canvas/image renderer.
- `src/game/Render/Terminal.ts` - text/raw renderer.
- `src/game/Type.ts` - all shared type definitions.
- `src/game/Type/Pos.ts` - position helpers.
- `src/game/Type/Dir.ts` - direction to delta conversion.
- `src/game/Type/Sprite.ts` - sprite id formatter.
- `src/game/Type/Image.ts` - image cache + preload.
- `src/game/Type/Nav.ts` - line/grid cursor navigation.
- `src/game/Type/Monster.ts` - typed monster table wiring.
- `src/game/Type/Creature.ts` - runtime creature helpers.
- `src/game/Type/Dialog.ts` - dialog runtime/view helpers.
- `src/game/Type/Glyph.ts` - generic glyph helper functions.
- `src/game/Type/Entity.ts` - entity creation/movement/interpolation.
- `src/game/Type/Battle.ts` - battle logic + transitions.
- `src/game/Type/Tile.ts` - tile helpers.
- `src/game/Type/Map.ts` - immutable map helpers.
- `src/game/Type/Map/Build.ts` - map parser + glyph application + teleports.
- `src/game/Type/Map/World.ts` - world creation + door teleport wiring.
- `src/game/Type/State.ts` - shared movement/state helpers.
- `src/game/Type/State/Battle.ts` - battle-specific post/tick handling.
- `src/game/Type/State/Dialog.ts` - dialog open/advance/close handling.
- `src/game/Type/State/Menu.ts` - menu open/close/navigation handling.
- `src/data/Glyph.ts` - glyph token map to glyph functions.
- `src/data/World.ts` - world text map and origin.
- `src/data/Sprite.ts` - sprite-to-glyph and letter-to-sprite tables.
- `src/data/Monster.ts` - monster/species data.
- `src/data/Move.ts` - move data.
- `src/data/Menu.ts` - menu labels.

## Core data model
- `Map` is `Immutable.Map<string, Tile>` keyed by `"x,y"`.
- `Tile` is `{ ground, entity, on_walk }`.
- `ground` is only a sprite id (`Type.Sprite`).
- `entity` is optional and includes `blocks` for collision.
- `Dir` is uppercase 2-letter directions:
  `UP`, `DW`, `LF`, `RG`, `UL`, `UR`, `DL`, `DR`.
- `RenderMode` is `"IMG" | "RAW"`.
- `Specie` is a string id; runtime monsters are `Creature`.
- `State` is the root aggregate: map, player position, dialog, menu, battle.

## Type.ts organization
`src/game/Type.ts` is split into sections ordered from smaller primitives to
larger aggregates, ending in `State`. Sections map 1:1 to helper files in
`src/game/Type/` (and grouped domains like `Map/*` and `State/*`).

## Glyph + map system
- `Type.Glyph` is a 3-char string token.
- `src/data/Glyph.ts` is a single map:
  `Record<Type.Glyph, Type.GlyphFn>`.
- Glyph helper constructors live in `src/game/Type/Glyph.ts`.
- `GlyphFn` signature receives:
  `glyph`, tile `pos`, region `coord`, `border` neighbors, region `span`.
- `GlyphFn` returns exactly one of:
  `null`, `Type.Sprite` (ground), or `Type.Entity`.
- World format is `XXX|` cells (4 chars each):
  first 3 chars are glyph token, 4th is `|` separator.
- Two lines define each tile row:
  entity row first, then ground row.
- `Build.insert(...)` applies ground pass first, then entity pass.
- Region metadata (`coord` + `span`) is computed from contiguous equal glyphs.

### Active glyph tokens
- `"   "` empty/no-op glyph.
- `"___"` grass.
- `",,,"` dark grass.
- `"_/\\"` tree big image.
- `"###"` mountain bordered autotile.
- `"_,_"` brick floor.
- `"[+]"` poke center big image.
- `"RED"` player entity.
- `"()>"` bird entity.
- `"<_>"` door entity (non-blocking).
- `":::"` invisible wall entity (blocking).

## Autotile rules
- Mountain uses bordered autotiling (`Glyph.borded`).
- Neighbor checks use all 8 directions.
- Suffix set:
  `center`, edge variants, outer corner variants, inner corner variants.
- Asset naming: `<name>_<suffix>.png`.

## Rendering rules
- Draw order: ground first, then entities.
- Entity sprites can be:
  - `ent_*` animated directional sheets.
  - `icon_*` static icons.
  - `tile_*` static tile sprites used as entities (for doors, etc).
- RAW mode resolves glyphs through `data/Sprite.ts`.
- RAW empty defaults are `"___"` (ground) and `"   "` (entity).

## Input rules
- `W/A/S/D` controls movement intent.
- `J` interacts/advances dialog.
- `L` opens menu.
- `K` closes screens where applicable.

## Import conventions (strict)
- Use namespace imports only: `import * as Foo from "./Foo"`.
- Do not use default or named imports.
- Alias name must match file/module name.

## Coding conventions (strict)
- Types are `CamelCase`.
- Values/functions are `snake_case`.
- Keep helpers small and composable.
- Keep state updates immutable.
- Keep all generic algorithms in `src/game/`.
- Keep data tables in `src/data/`.

## State rules
- `Game.on_tick` and `Game.on_post` are pure and deterministic.
- Never mutate existing state objects.
- Use `Map.get` / `Map.set` helpers for map operations.

## Notes
- `move_cooldown` and `move_ticks` are both `16`.
- Map strings live in `src/data/World.ts`.
- Run `bun run build` after any code change.
