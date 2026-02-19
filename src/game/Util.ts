import * as Const from "./Const";

const start_ms = Date.now();
const ms_tick = 1000 / Const.tick_rate;
const hash_init = 2166136261;
const hash_mul = 16777619;

// Clamp a value between min and max.
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Get the current simulation tick.
export function tick_now(): number {
  return Math.floor((Date.now() - start_ms) / ms_tick);
}

// Create a deterministic hash from one integer input.
export function hash_step(seed: number, value: number): number {
  const next = seed ^ (value | 0);
  return Math.imul(next, hash_mul) >>> 0;
}

// Hash text into a deterministic 32-bit integer.
export function hash_text(text: string): number {
  let seed = hash_init;
  for (let i = 0; i < text.length; i++) {
    seed = hash_step(seed, text.charCodeAt(i));
  }
  return seed >>> 0;
}

// Convert a 32-bit hash value to [0, 1).
export function hash_unit(seed: number): number {
  return (seed >>> 0) / 4294967296;
}
