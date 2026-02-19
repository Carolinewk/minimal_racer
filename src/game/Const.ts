export const tick_rate = 64;
export const match_timer_seconds = 60;
export const match_timer_ticks = match_timer_seconds * tick_rate;
export const start_countdown_from = 5;
export const start_countdown_ticks = start_countdown_from * tick_rate;

// render
export const tile_size = 16;
export const view_cols = 10;
export const view_rows = 9;
export const move_ticks = 16;
export const move_cooldown = 16;
export const turn_cooldown = move_ticks / 2;
export const dialog_char_ticks = 3;

// world
export const world_width = 220;
export const world_height = 200;
