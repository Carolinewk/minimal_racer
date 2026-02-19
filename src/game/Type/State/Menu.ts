import * as MenuData from "../../../data/Menu";
import * as Nav from "../Nav";
import * as State from "../State";
import * as Map from "../Map";
import * as Creature from "../Creature";
import * as Post from "../Post";
import * as Type from "../../Type";

// Build a start menu state object.
function menu_start(selected_index: number): Type.Menu {
  return { mode: "start", selected_index, mon_index: 0 };
}

// Read the player party list from the map.
function player_party(state: { shared: Type.State; player: Type.PlayerState }): Type.Creature[] {
  const entity = Map.entity_at(state.shared.map, state.player.player_pos);
  if (!entity) {
    return [];
  }
  return entity.party;
}

// Enter the party picker mode from the start menu.
function open_party(
  state: { shared: Type.State; player: Type.PlayerState },
  menu: Type.Menu
): { shared: Type.State; player: Type.PlayerState } {
  const party = player_party(state);
  const total = Creature.party_total(party);
  if (total <= 0) {
    return state;
  }
  let mon_index = menu.mon_index;
  if (mon_index < 0 || mon_index >= total) {
    mon_index = 0;
  }
  const next_menu = { ...menu, mode: "party", mon_index };
  const player = { ...state.player, menu: next_menu };
  return { ...state, player };
}

// Return from the party picker mode to the start menu.
function close_party(
  state: { shared: Type.State; player: Type.PlayerState },
  menu: Type.Menu
): { shared: Type.State; player: Type.PlayerState } {
  const next_menu = { ...menu, mode: "start" };
  const player = { ...state.player, menu: next_menu };
  return { ...state, player };
}

// Confirm a party pick and swap with the first party slot.
function pick_party(
  state: { shared: Type.State; player: Type.PlayerState },
  menu: Type.Menu
): { shared: Type.State; player: Type.PlayerState } {
  const party = player_party(state);
  const swapped = Creature.party_swap_first(party, menu.mon_index);
  let next = state;
  if (swapped) {
    next = State.player_transform(state, player => {
      return { ...player, party: swapped };
    });
  }
  const next_menu = { ...menu, mode: "party" };
  const player = { ...next.player, menu: next_menu };
  return { ...next, player };
}

// Open the start menu and close dialog.
export function open(state: { shared: Type.State; player: Type.PlayerState }): { shared: Type.State; player: Type.PlayerState } {
  const player = { ...state.player, menu: menu_start(0), dialog: null };
  return { ...state, player };
}

// Apply a post to an open menu.
export function on_post(
  post: Post.KeyPost,
  state: { shared: Type.State; player: Type.PlayerState }
): { shared: Type.State; player: Type.PlayerState } {
  const menu = state.player.menu;
  if (!menu) {
    return state;
  }
  if (post.down !== 1) {
    return state;
  }

  if (menu.mode === "party") {
    if (post.key === "K") {
      return close_party(state, menu);
    }
    if (post.key === "W" || post.key === "S") {
      const party = player_party(state);
      const total = Creature.party_total(party);
      if (total <= 0) {
        return close_party(state, menu);
      }
      const nav: Type.NavLine = { index: menu.mon_index, items: total };
      const next_nav = Nav.line(nav, post.key);
      if (next_nav.index === menu.mon_index) {
        return state;
      }
      const next_menu = { ...menu, mon_index: next_nav.index };
      const player = { ...state.player, menu: next_menu };
      return { ...state, player };
    }
    if (post.key === "J") {
      return pick_party(state, menu);
    }
    return state;
  }

  const total = MenuData.items.length;
  if (total === 0) {
    return state;
  }
  if (post.key === "W" || post.key === "S") {
    const nav: Type.NavLine = {
      index: menu.selected_index,
      items: total
    };
    const next_nav = Nav.line(nav, post.key);
    if (next_nav.index === menu.selected_index) {
      return state;
    }
    const next_menu = { ...menu, selected_index: next_nav.index };
    const player = { ...state.player, menu: next_menu };
    return { ...state, player };
  }
  switch (post.key) {
    case "J": {
      const item = MenuData.items[menu.selected_index];
      if (item !== "PARTY") {
        return state;
      }
      return open_party(state, menu);
    }
    case "K": {
      const player = { ...state.player, menu: null };
      return { ...state, player };
    }
    default:
      return state;
  }
}
