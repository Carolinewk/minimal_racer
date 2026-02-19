import * as Type from "../Type";

// Step one index by key with wrap-around.
export function step(
  nav: Type.NavLine,
  key: Type.KeyInput,
  UP: Type.KeyInput,
  DW: Type.KeyInput
): Type.NavLine {
  const items = nav.items;
  if (items <= 0) {
    return nav;
  }
  if (key === UP) {
    const index = (nav.index - 1 + items) % items;
    return { ...nav, index };
  }
  if (key === DW) {
    const index = (nav.index + 1) % items;
    return { ...nav, index };
  }
  return nav;
}

// Move a line cursor with W and S keys.
export function line(
  nav: Type.NavLine,
  key: Type.KeyInput
): Type.NavLine {
  return step(nav, key, "W", "S");
}

// Move a grid cursor with W A S D keys.
export function grid(
  nav: Type.NavGrid,
  key: Type.KeyInput
): Type.NavGrid {
  const row_nav: Type.NavLine = {
    index: nav.row_index,
    items: nav.row_total
  };
  const col_nav: Type.NavLine = {
    index: nav.col_index,
    items: nav.col_total
  };
  const next_row = step(row_nav, key, "W", "S");
  const next_col = step(col_nav, key, "A", "D");
  return {
    ...nav,
    row_index: next_row.index,
    col_index: next_col.index
  };
}
