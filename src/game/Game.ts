import * as World from "./Type/Map/World";
import * as Map from "./Type/Map";
import * as Post from "./Type/Post";
import * as Players from "./Type/State/Players";
import * as Type from "./Type";

// Build the initial game state.
export function create(): Type.State {
  const world = World.create();
  let map = world.map;
  const spawn_tile = Map.get(map, world.player_pos);
  if (spawn_tile && spawn_tile.entity) {
    if (spawn_tile.entity.name === "Player") {
      map = Map.set(map, world.player_pos, { ...spawn_tile, entity: null });
    }
  }
  return {
    map,
    spawn_pos: world.player_pos,
    players: {},
    ready_players: {},
    game_started: false,
    game_start_tick: null,
    winner_name: null,
    game_end_tick: null,
    tick: 0,
    timer_start_tick: null
  };
}

// Update the full multiplayer state for one simulation tick.
export function on_tick(state: Type.State): Type.State {
  let next = { ...state, tick: state.tick + 1 };
  next = Players.expire_inactive(next);
  next = Players.game_countdown_progress(next);
  const ids = Players.player_ids(next);
  for (let i = 0; i < ids.length; i++) {
    const pid = ids[i];
    const scoped = Players.player_project(next, pid);
    const updated = Players.on_tick_player(scoped, next.tick);
    next = Players.player_commit(next, pid, updated);
  }
  return next;
}

// Apply a network post to the shared multiplayer state.
export function on_post(
  post: Type.Post,
  state: Type.State
): Type.State {
  if (Post.is_join_post(post)) {
    return Players.player_join(state, post.pid, post.player_name);
  }
  if (Post.is_leave_post(post)) {
    return Players.player_leave(state, post.pid);
  }
  if (Post.is_ping_post(post)) {
    let next = state;
    if (!Players.player_get(next, post.pid)) {
      next = Players.player_join(next, post.pid, post.player_name);
    }
    next = Players.player_name_set(next, post.pid, post.player_name);
    return Players.player_touch(next, post.pid);
  }
  if (Post.is_ready_post(post)) {
    let next = state;
    if (!Players.player_get(next, post.pid)) {
      next = Players.player_join(next, post.pid, "Player");
    }
    if (!Players.player_get(next, post.pid)) {
      return next;
    }
    next = Players.player_touch(next, post.pid);
    return Players.player_ready(next, post.pid);
  }
  if (Post.is_start_post(post)) {
    let next = state;
    if (!Players.player_get(next, post.pid)) {
      next = Players.player_join(next, post.pid, "Player");
    }
    if (!Players.player_get(next, post.pid)) {
      return next;
    }
    next = Players.player_touch(next, post.pid);
    return Players.game_start_try(next, post.pid);
  }
  if (!Post.is_key_post(post)) {
    return state;
  }

  let next = state;
  if (!Players.player_get(next, post.pid)) {
    next = Players.player_join(next, post.pid, "Player");
  }
  if (!Players.player_get(next, post.pid)) {
    return next;
  }
  next = Players.player_touch(next, post.pid);
  const scoped = Players.player_project(next, post.pid);
  const updated = Players.on_key_post(post, scoped);
  return Players.player_commit(next, post.pid, updated);
}
