import * as Dialog from "../Dialog";
import * as Post from "../Post";
import * as State from "../State";
import * as Tile from "../Tile";
import * as Type from "../../Type";

// Open a dialog if the player is facing a dialog source.
export function open_facing(
  state: { shared: Type.State; player: Type.PlayerState },
  tick: number
): { shared: Type.State; player: Type.PlayerState } {
  const tile = State.player_tile_facing(state);
  if (!tile) {
    return state;
  }
  const dialog = Tile.dialog(tile);
  if (!dialog) {
    return state;
  }
  const dialog_state = Dialog.create(dialog, tick);
  const player = { ...state.player, dialog: dialog_state, menu: null };
  return { ...state, player };
}

// Apply a post to an open dialog.
export function on_post(
  post: Post.KeyPost,
  state: { shared: Type.State; player: Type.PlayerState }
): { shared: Type.State; player: Type.PlayerState } {
  const dialog_state = state.player.dialog;
  if (!dialog_state) {
    return state;
  }
  if (post.down === 1 && post.key === "J") {
    const next = Dialog.advance(dialog_state, state.shared.tick);
    const player = { ...state.player, dialog: next };
    return { ...state, player };
  }
  return state;
}
