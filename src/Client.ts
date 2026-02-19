import * as VibiNet from "vibinet";
import * as Sprite from "./data/Sprite";
import * as Const from "./game/Const";
import * as Game from "./game/Game";
import * as Image from "./game/Type/Image";
import * as Post from "./game/Type/Post";
import * as Players from "./game/Type/State/Players";
import * as Smooth from "./game/Type/State/Smooth";
import * as RenderScreen from "./game/Render/Screen";
import * as RenderTerminal from "./game/Render/Terminal";
import * as Type from "./game/Type";

const terminal_cols = 40;
const terminal_rows = 18;
const terminal_w = 320;
const terminal_h = 288;
const terminal_font_name = "Menlo";
const pid_storage_key = "vibimon_pid";
const player_name_storage_key = "vibimon_player_name";
const player_name_default = "Player";
const player_name_max_chars = 16;
// Bump the default room name when post packing changes to avoid
// decode crashes from incompatible clients sharing the same room.
const room_default = "vibimon_v3";
const tolerance_ms = 300;
const ping_interval_ms = 5_000;
const join_denied_message = `You are not allowed to enter the game. Maximum players is ${Players.max_players}.`;
const start_prompt_ready_min = 2;
const start_prompt_message = `Ready ${start_prompt_ready_min}/${Players.max_players}. Start the game now?`;
const loading_dots_interval_ms = 160;
const loading_state_poll_ms = 120;
const loading_dots_frames = [".", "..", "..."];
const tick_ms = 1000 / Const.tick_rate;
const countdown_beep_ms = 90;
const start_beep_ms = 820;
const countdown_beep_gain = 0.035;
const start_beep_gain = countdown_beep_gain;
type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

// Grab the game canvas element.
const canvas_el = document.getElementById("game");
if (!(canvas_el instanceof HTMLCanvasElement)) {
  throw new Error("missing #game canvas");
}
const canvas = canvas_el;

// Create the 2d rendering context.
const ctx_raw = canvas.getContext("2d");
if (!ctx_raw) {
  throw new Error("unable to create 2d context");
}
const ctx: CanvasRenderingContext2D = ctx_raw;

const terminal_el = document.getElementById("terminal");
const raw_toggle_el = document.getElementById("raw-toggle");
const players_canvas_el = document.getElementById("players-canvas");
const timer_canvas_el = document.getElementById("timer-canvas");
const loading_screen_el = document.getElementById("loading-screen");
const loading_dots_el = document.getElementById("loading-dots");
const terminal = terminal_el instanceof HTMLTextAreaElement ? terminal_el : null;
const raw_toggle = raw_toggle_el instanceof HTMLInputElement ? raw_toggle_el : null;
const players_canvas = players_canvas_el instanceof HTMLCanvasElement ? players_canvas_el : null;
const timer_canvas = timer_canvas_el instanceof HTMLCanvasElement ? timer_canvas_el : null;
const loading_screen = loading_screen_el instanceof HTMLDivElement ? loading_screen_el : null;
const loading_dots = loading_dots_el instanceof HTMLSpanElement ? loading_dots_el : null;
const root = document.documentElement;
const players_hud = players_canvas?.parentElement instanceof HTMLDivElement
  ? players_canvas.parentElement
  : null;
const timer_hud = timer_canvas?.parentElement instanceof HTMLDivElement
  ? timer_canvas.parentElement
  : null;
const players_ctx = players_canvas ? players_canvas.getContext("2d") : null;
const timer_ctx = timer_canvas ? timer_canvas.getContext("2d") : null;
const hud_font_px = 8;
const hud_bg_color = "#ffffff";

// Keep pixel art crisp.
ctx.imageSmoothingEnabled = false;
if (players_ctx) {
  players_ctx.imageSmoothingEnabled = false;
}
if (timer_ctx) {
  timer_ctx.imageSmoothingEnabled = false;
}

let render_mode: Type.RenderMode = "IMG";
const measure_canvas = document.createElement("canvas");
const measure_ctx = measure_canvas.getContext("2d");

// Build a CSS font list string.
function font_css(name: string): string {
  return `"${name}", monospace`;
}

// Store the terminal font css.
const terminal_font_css = font_css(terminal_font_name);

// Read a query parameter value.
function query_value(key: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  if (!value) {
    return null;
  }
  return value;
}

// Create or read a stable player id.
function player_pid(): string {
  const query_pid = query_value("pid");
  if (query_pid) {
    return query_pid;
  }
  try {
    const saved = window.localStorage.getItem(pid_storage_key);
    if (saved) {
      return saved;
    }
    const next = VibiNet.VibiNet.gen_name();
    window.localStorage.setItem(pid_storage_key, next);
    return next;
  } catch {
    return VibiNet.VibiNet.gen_name();
  }
}

// Clamp a player name to a safe display value.
function player_name_value(raw: string): string {
  const value = raw.trim().slice(0, player_name_max_chars);
  if (!value) {
    return player_name_default;
  }
  return value;
}

// Create or read a stable player display name.
function player_name(): string {
  const query_name = query_value("name");
  if (query_name) {
    return player_name_value(query_name);
  }
  try {
    const saved = window.localStorage.getItem(player_name_storage_key);
    if (saved) {
      return player_name_value(saved);
    }
  } catch {
    // Fall through to prompt/default.
  }

  let next = player_name_default;
  try {
    const input = window.prompt("Enter your player name:", player_name_default);
    if (typeof input === "string") {
      next = player_name_value(input);
    }
    window.localStorage.setItem(player_name_storage_key, next);
  } catch {
    next = player_name_default;
  }
  return next;
}

const room = query_value("room") || room_default;
const server = query_value("server") || undefined;
const pid = player_pid();
const player_name_value_cached = player_name();
const initial_state = Game.create();

const game = new VibiNet.VibiNet.game<Type.State, Type.Post>({
  server,
  room,
  initial: initial_state,
  on_tick: Game.on_tick,
  on_post: Game.on_post,
  packer: Post.packer,
  tick_rate: Const.tick_rate,
  tolerance: tolerance_ms,
  smooth: (remote_state, local_state) => {
    return Smooth.smooth_player_prediction(remote_state, local_state, pid);
  }
});

let join_posted = false;
let join_denied_alert_shown = false;
let last_ping_ms = 0;
let loading_dot_index = 0;
let loading_last_frame_ms = 0;
let loading_accum_ms = 0;
let loading_last_poll_ms = 0;
let shared_cache = initial_state;
let last_ready_total = 0;
let timer_start_tick_seen: Type.Maybe<number> = null;
let timer_start_local_ms = 0;
let game_end_tick_seen: Type.Maybe<number> = null;
let game_end_local_ms = 0;
let last_countdown_audio_value = -1;
let start_audio_tick_seen: Type.Maybe<number> = null;
let audio_ctx: AudioContext | null = null;

// Track held keys for blur/release safety.
const held_keys: Record<Type.KeyInput, boolean> = {
  A: false,
  S: false,
  D: false,
  W: false,
  J: false,
  K: false,
  L: false
};

// Post one key event to the shared room.
function post_key(key: Type.KeyInput, down: boolean): void {
  game.post(Post.key(pid, key, down));
}

// Post one liveness ping so stale sessions can be cleaned up.
function post_ping(now_ms: number): void {
  if (!join_posted) {
    return;
  }
  if (now_ms - last_ping_ms < ping_interval_ms) {
    return;
  }
  last_ping_ms = now_ms;
  game.post(Post.ping(pid, player_name_value_cached));
}

// Lazily create the shared audio context for cue sounds.
function audio_context_get(): AudioContext | null {
  if (audio_ctx) {
    return audio_ctx;
  }
  try {
    const win = window as AudioWindow;
    const Ctx = win.AudioContext || win.webkitAudioContext;
    if (!Ctx) {
      return null;
    }
    audio_ctx = new Ctx();
    return audio_ctx;
  } catch {
    return null;
  }
}

// Resume audio after user interaction if browser autoplay blocked it.
function audio_unlock(): void {
  const audio = audio_context_get();
  if (!audio) {
    return;
  }
  if (audio.state === "suspended") {
    void audio.resume();
  }
}

// Play one short square-wave cue.
function audio_beep(freq: number, ms: number, gain_peak: number): void {
  const audio = audio_context_get();
  if (!audio) {
    return;
  }
  if (audio.state === "suspended") {
    void audio.resume();
  }
  const start = audio.currentTime;
  const end = start + ms / 1000;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gain_peak, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(end + 0.01);
}

// Play one countdown tick sound.
function play_countdown_sound(): void {
  // Use the same pitch as the start cue, but shorter during countdown.
  audio_beep(1320, countdown_beep_ms, countdown_beep_gain);
}

// Play the start signal once countdown ends.
function play_start_sound(): void {
  audio_beep(1320, start_beep_ms, start_beep_gain);
}

// Build animated loading dots text with 1..3 trailing dots.
function loading_dots_text(now_ms: number): string {
  if (loading_last_frame_ms === 0) {
    loading_last_frame_ms = now_ms;
    return loading_dots_frames[loading_dot_index];
  }
  let delta_ms = now_ms - loading_last_frame_ms;
  if (delta_ms < 0) {
    delta_ms = 0;
  }
  loading_last_frame_ms = now_ms;
  loading_accum_ms += delta_ms;

  while (loading_accum_ms >= loading_dots_interval_ms) {
    loading_accum_ms -= loading_dots_interval_ms;
    loading_dot_index = (loading_dot_index + 1) % loading_dots_frames.length;
  }

  return loading_dots_frames[loading_dot_index];
}

// Toggle loading overlay visibility.
function show_loading(visible: boolean): void {
  if (!loading_screen) {
    return;
  }
  loading_screen.style.display = visible ? "flex" : "none";
}

// Update animated loading dots in the overlay.
function update_loading(now_ms: number): void {
  if (!loading_dots) {
    return;
  }
  loading_dots.textContent = loading_dots_text(now_ms);
}

// Sync local timer timestamps to authoritative networked ticks.
function sync_match_clock(shared: Type.State, now_ms: number): void {
  const start_tick = shared.timer_start_tick;
  if (start_tick === null) {
    timer_start_tick_seen = null;
    timer_start_local_ms = 0;
    game_end_tick_seen = null;
    game_end_local_ms = 0;
    return;
  }

  if (timer_start_tick_seen !== start_tick) {
    const elapsed_ticks = Math.max(0, shared.tick - start_tick);
    timer_start_tick_seen = start_tick;
    timer_start_local_ms = now_ms - elapsed_ticks * tick_ms;
    game_end_tick_seen = null;
    game_end_local_ms = 0;
  }

  const end_tick = shared.game_end_tick;
  if (end_tick === null) {
    game_end_tick_seen = null;
    game_end_local_ms = 0;
    return;
  }

  if (game_end_tick_seen !== end_tick) {
    const elapsed_ticks = Math.max(0, end_tick - start_tick);
    game_end_tick_seen = end_tick;
    game_end_local_ms = timer_start_local_ms + elapsed_ticks * tick_ms;
  }
}

// Read remaining match time in local milliseconds.
function timer_remaining_ms(shared: Type.State, now_ms: number): number {
  const start_tick = shared.timer_start_tick;
  if (start_tick === null) {
    return Const.match_timer_seconds * 1000;
  }

  let clock_ms = now_ms;
  if (shared.game_end_tick !== null && game_end_local_ms > 0) {
    clock_ms = Math.min(clock_ms, game_end_local_ms);
  }

  const elapsed_ms = Math.max(0, clock_ms - timer_start_local_ms);
  const remaining = Const.match_timer_seconds * 1000 - elapsed_ms;
  if (remaining <= 0) {
    return 0;
  }

  return remaining;
}

// Format the match timer as M:SS.
function timer_text(shared: Type.State, now_ms: number): string {
  const remaining_ms = timer_remaining_ms(shared, now_ms);
  const seconds = Math.ceil(remaining_ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Build the players text as "Players x/max".
function players_text(shared: Type.State): string {
  const total = Object.keys(shared.players).length;
  return `Players ${total}/${Players.max_players}`;
}

// Draw one HUD character with the in-game font sprite set.
function draw_hud_char(
  hud_ctx: CanvasRenderingContext2D,
  ch: string,
  x: number,
  y: number
): void {
  const id = Sprite.letter_to_sprite[ch] || Sprite.fallback_sprite;
  const image = Image.get(id);
  if (!Image.ready(image)) {
    return;
  }
  hud_ctx.drawImage(image, x, y, hud_font_px, hud_font_px);
}

// Draw centered HUD text on one target canvas.
function draw_hud_text(
  hud_canvas: HTMLCanvasElement,
  hud_ctx: CanvasRenderingContext2D,
  text: string
): void {
  const w = hud_canvas.width;
  const h = hud_canvas.height;
  hud_ctx.clearRect(0, 0, w, h);
  hud_ctx.fillStyle = hud_bg_color;
  hud_ctx.fillRect(0, 0, w, h);

  const text_w = text.length * hud_font_px;
  const start_x = Math.floor((w - text_w) * 0.5);
  const start_y = Math.floor((h - hud_font_px) * 0.5);
  for (let i = 0; i < text.length; i++) {
    draw_hud_char(hud_ctx, text[i], start_x + i * hud_font_px, start_y);
  }
}

// Render the outside players label.
function update_players(shared: Type.State): void {
  if (!players_canvas || !players_ctx) {
    return;
  }
  if (shared.game_started) {
    players_ctx.clearRect(0, 0, players_canvas.width, players_canvas.height);
    return;
  }
  draw_hud_text(players_canvas, players_ctx, players_text(shared));
}

// Render the outside timer label.
function update_timer(shared: Type.State, now_ms: number): void {
  if (!timer_canvas || !timer_ctx) {
    return;
  }
  draw_hud_text(timer_canvas, timer_ctx, timer_text(shared, now_ms));
}

// Toggle outside HUD layout after the match starts.
function update_hud_visibility(shared: Type.State): void {
  if (!players_hud || !timer_hud) {
    return;
  }
  if (shared.game_started) {
    players_hud.style.display = "none";
    timer_hud.style.gridColumn = "1 / -1";
    return;
  }
  players_hud.style.display = "";
  timer_hud.style.gridColumn = "";
}

// Prompt once when ready count crosses the "start allowed" threshold.
function maybe_prompt_start(shared: Type.State): void {
  const ready = Players.ready_total(shared);
  if (!shared.game_started) {
    if (ready >= start_prompt_ready_min && last_ready_total < start_prompt_ready_min) {
      const should_start = window.confirm(start_prompt_message);
      if (should_start) {
        game.post(Post.start(pid));
      }
    }
  }
  last_ready_total = ready;
}

// Play countdown and start cues on state transitions.
function update_audio_cues(shared: Type.State): void {
  const start_tick = shared.timer_start_tick;
  if (start_tick === null) {
    start_audio_tick_seen = null;
  } else if (start_audio_tick_seen !== start_tick) {
    start_audio_tick_seen = start_tick;
    play_start_sound();
  }

  if (!Players.game_countdown_visible(shared)) {
    last_countdown_audio_value = -1;
    return;
  }

  const value = Players.game_countdown_value(shared);
  if (value <= 0) {
    last_countdown_audio_value = value;
    return;
  }
  if (value === last_countdown_audio_value) {
    return;
  }
  last_countdown_audio_value = value;
  play_countdown_sound();
}

// Check if a pixel point is inside a rectangle.
function in_rect(
  x: number,
  y: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  if (x < rect.x || y < rect.y) {
    return false;
  }
  if (x >= rect.x + rect.w || y >= rect.y + rect.h) {
    return false;
  }
  return true;
}

// Handle click-to-ready on the bottom-center ready button area.
function on_canvas_click(event: MouseEvent): void {
  audio_unlock();
  if (!join_posted) {
    return;
  }
  if (render_mode !== "IMG") {
    return;
  }
  const shared = shared_cache;
  if (shared.game_started) {
    return;
  }
  const player = Players.player_get(shared, pid);
  if (!player) {
    return;
  }
  if (player.menu && player.menu.mode === "start") {
    return;
  }
  if (Players.player_is_ready(shared, pid)) {
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  if (bounds.width <= 0 || bounds.height <= 0) {
    return;
  }
  const px = Math.floor((event.clientX - bounds.left) * (canvas.width / bounds.width));
  const py = Math.floor((event.clientY - bounds.top) * (canvas.height / bounds.height));
  const button = RenderScreen.ready_button_rect();
  if (!in_rect(px, py, button)) {
    return;
  }
  game.post(Post.ready(pid));
}

// Read shared state with lighter polling while we are still loading.
function read_shared(now_ms: number): Type.State {
  if (game.initial_time() === null) {
    shared_cache = initial_state;
    return shared_cache;
  }

  const has_player = Players.player_get(shared_cache, pid);
  if (!has_player) {
    if (now_ms - loading_last_poll_ms < loading_state_poll_ms) {
      return shared_cache;
    }
    loading_last_poll_ms = now_ms;
  }

  shared_cache = game.compute_render_state();
  return shared_cache;
}

// Post leave and close the network client.
function close_game(): void {
  try {
    game.post(Post.leave(pid));
  } catch {
    // Ignore close-time post errors.
  }
  game.close();
}

// Show a one-time denial prompt when a full room rejects this join.
function show_join_denied(shared: Type.State): void {
  if (!join_posted || join_denied_alert_shown) {
    return;
  }
  if (Players.player_get(shared, pid)) {
    return;
  }
  const player_total = Object.keys(shared.players).length;
  if (player_total < Players.max_players) {
    return;
  }
  join_denied_alert_shown = true;
  window.alert(join_denied_message);
}

// Release all held keys in the room.
function release_all_keys(): void {
  for (const key of Post.key_inputs) {
    if (!held_keys[key]) {
      continue;
    }
    held_keys[key] = false;
    post_key(key, false);
  }
}

// Apply the current font selection.
function apply_terminal_font(): void {
  root.style.setProperty("--terminal-font", terminal_font_css);
  apply_terminal_metrics();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      apply_terminal_metrics();
    });
  }
}

// Measure the glyph width for the active terminal font.
function terminal_glyph_width(font_css: string, size: number): number {
  if (!measure_ctx) {
    return 0;
  }
  measure_ctx.font = `${size}px ${font_css}`;
  const metrics = measure_ctx.measureText("0");
  return metrics.width;
}

// Apply terminal sizing to match the canvas resolution.
function apply_terminal_metrics(): void {
  const test_size = 100;
  const glyph_w = terminal_glyph_width(terminal_font_css, test_size);
  if (glyph_w <= 0) {
    return;
  }
  const target_w = terminal_w / terminal_cols;
  const line_h = terminal_h / terminal_rows;
  const font_a = (target_w * test_size) / glyph_w;
  const font_size = Math.min(font_a, line_h);
  root.style.setProperty("--terminal-font-size", `${font_size.toFixed(2)}px`);
  root.style.setProperty("--terminal-line-height", `${line_h}px`);
}

// Toggle between canvas and raw terminal rendering.
function toggle_render_mode(): void {
  if (render_mode === "RAW") {
    set_render_mode("IMG");
    if (raw_toggle) {
      raw_toggle.checked = false;
    }
    return;
  }
  set_render_mode("RAW");
  if (raw_toggle) {
    raw_toggle.checked = true;
  }
}

// Toggle the active render mode.
function set_render_mode(mode: Type.RenderMode): void {
  if (!terminal) {
    render_mode = "IMG";
    canvas.style.display = "block";
    return;
  }

  render_mode = mode;
  if (render_mode === "RAW") {
    canvas.style.display = "none";
    terminal.style.display = "block";
    return;
  }

  canvas.style.display = "block";
  terminal.style.display = "none";
}

// Preload known sprites up front.
// "wall" is a RAW-only/invisible blocker and has no image asset.
const sprite_ids = Object.keys(Sprite.sprite_to_glyph).filter((id) => id !== "wall");
Image.preload(sprite_ids);

// Advance the networked sim and render a frame.
function frame(): void {
  const now_ms = Date.now();
  post_ping(now_ms);
  const shared = read_shared(now_ms);
  sync_match_clock(shared, now_ms);
  update_hud_visibility(shared);
  update_players(shared);
  update_timer(shared, now_ms);
  update_audio_cues(shared);
  show_join_denied(shared);
  const player = Players.player_get(shared, pid);
  if (!player) {
    show_loading(true);
    update_loading(now_ms);
    if (!loading_screen) {
      if (render_mode === "RAW") {
        if (terminal) {
          terminal.value = "Loading" + loading_dots_text(now_ms);
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    requestAnimationFrame(frame);
    return;
  }
  show_loading(false);
  maybe_prompt_start(shared);

  const state = {
    shared,
    player
  };
  const tick = state.shared.tick;
  if (render_mode === "RAW") {
    if (terminal) {
      terminal.value = RenderTerminal.on_draw_raw(state, tick);
    }
  } else {
    RenderScreen.on_draw(ctx, state, tick);
  }
  requestAnimationFrame(frame);
}

// Handle keyboard input and post actions.
function handle_key(event: KeyboardEvent, down: boolean): void {
  if (down && event.repeat) {
    return;
  }
  if (down) {
    audio_unlock();
  }
  if (event.key === "Tab") {
    if (!down) {
      return;
    }
    event.preventDefault();
    toggle_render_mode();
    return;
  }
  const upper = event.key.toUpperCase();
  if (!Post.is_key_input(upper)) {
    return;
  }
  event.preventDefault();

  const key = upper;
  if (down) {
    if (held_keys[key]) {
      return;
    }
    held_keys[key] = true;
    post_key(key, true);
    return;
  }
  if (!held_keys[key]) {
    return;
  }
  held_keys[key] = false;
  post_key(key, false);
}

// Join the room once time sync is ready.
game.on_sync(() => {
  join_posted = true;
  game.post(Post.join(pid, player_name_value_cached));
  game.post(Post.ping(pid, player_name_value_cached));
});

// Wire input and kick the render loop.
window.addEventListener("keydown", (e) => handle_key(e, true));
window.addEventListener("keyup", (e) => handle_key(e, false));
window.addEventListener("blur", release_all_keys);
window.addEventListener("beforeunload", close_game);
canvas.addEventListener("click", on_canvas_click);

if (raw_toggle) {
  raw_toggle.addEventListener("change", () => {
    if (raw_toggle.checked) {
      set_render_mode("RAW");
      return;
    }
    set_render_mode("IMG");
  });
}

if (raw_toggle && raw_toggle.checked) {
  set_render_mode("RAW");
} else {
  set_render_mode("IMG");
}

apply_terminal_font();

requestAnimationFrame(frame);
