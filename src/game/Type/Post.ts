import * as VibiNet from "vibinet";
import * as Type from "../Type";

export type JoinPost = Extract<Type.Post, { $: "join" }>;
export type LeavePost = Extract<Type.Post, { $: "leave" }>;
export type KeyPost = Extract<Type.Post, { $: "key" }>;
export type PingPost = Extract<Type.Post, { $: "ping" }>;
export type ReadyPost = Extract<Type.Post, { $: "ready" }>;
export type StartPost = Extract<Type.Post, { $: "start" }>;

export const key_inputs: Type.KeyInput[] = ["A", "S", "D", "W", "J", "K", "L"];

export const packer: VibiNet.VibiNet.Packed = {
  $: "Union",
  variants: {
    join: {
      $: "Struct",
      fields: {
        pid: { $: "String" },
        player_name: { $: "String" }
      }
    },
    leave: {
      $: "Struct",
      fields: {
        pid: { $: "String" }
      }
    },
    key: {
      $: "Struct",
      fields: {
        pid: { $: "String" },
        key: { $: "String" },
        down: { $: "UInt", size: 1 }
      }
    },
    ping: {
      $: "Struct",
      fields: {
        pid: { $: "String" },
        player_name: { $: "String" }
      }
    },
    ready: {
      $: "Struct",
      fields: {
        pid: { $: "String" }
      }
    },
    start: {
      $: "Struct",
      fields: {
        pid: { $: "String" }
      }
    }
  }
};

// Check whether a raw keyboard value maps to a valid game key.
export function is_key_input(value: string): value is Type.KeyInput {
  return (
    value === "A" ||
    value === "S" ||
    value === "D" ||
    value === "W" ||
    value === "J" ||
    value === "K" ||
    value === "L"
  );
}

// Narrow one post variant by tag.
export function is_join_post(post: Type.Post): post is JoinPost {
  return post.$ === "join";
}

// Narrow one post variant by tag.
export function is_leave_post(post: Type.Post): post is LeavePost {
  return post.$ === "leave";
}

// Narrow one post variant by tag.
export function is_key_post(post: Type.Post): post is KeyPost {
  return post.$ === "key";
}

// Narrow one post variant by tag.
export function is_ping_post(post: Type.Post): post is PingPost {
  return post.$ === "ping";
}

// Narrow one post variant by tag.
export function is_ready_post(post: Type.Post): post is ReadyPost {
  return post.$ === "ready";
}

// Narrow one post variant by tag.
export function is_start_post(post: Type.Post): post is StartPost {
  return post.$ === "start";
}

// Build a join post value.
export function join(pid: string, player_name: string): JoinPost {
  return { $: "join", pid, player_name };
}

// Build a leave post value.
export function leave(pid: string): LeavePost {
  return { $: "leave", pid };
}

function down_value(down: boolean | 0 | 1): 0 | 1 {
  if (down === true || down === 1) {
    return 1;
  }
  return 0;
}

// Build a key post value.
export function key(
  pid: string,
  key: Type.KeyInput,
  down: boolean | 0 | 1
): KeyPost {
  return {
    $: "key",
    pid,
    key,
    down: down_value(down)
  };
}

// Build a ping post value.
export function ping(pid: string, player_name: string): PingPost {
  return { $: "ping", pid, player_name };
}

// Build a ready post value.
export function ready(pid: string): ReadyPost {
  return { $: "ready", pid };
}

// Build a start post value.
export function start(pid: string): StartPost {
  return { $: "start", pid };
}
