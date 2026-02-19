import * as Map from "../Map";
import * as Type from "../../Type";

function shift_tick_value(value: number, tick_offset: number): number {
  return value - tick_offset;
}

function shift_dialog_ticks(
  dialog_state: Type.Maybe<Type.Dialog>,
  tick_offset: number
): Type.Maybe<Type.Dialog> {
  if (!dialog_state || tick_offset === 0) {
    return dialog_state;
  }
  return {
    ...dialog_state,
    last_tick: shift_tick_value(dialog_state.last_tick, tick_offset)
  };
}

function shift_battle_anim_ticks(
  anim: Type.Maybe<Type.BattleAnim>,
  tick_offset: number
): Type.Maybe<Type.BattleAnim> {
  if (!anim || tick_offset === 0) {
    return anim;
  }
  return {
    ...anim,
    start_tick: shift_tick_value(anim.start_tick, tick_offset)
  };
}

function shift_battle_hp_ticks(
  hp_anim: Type.Maybe<Type.BattleHpAnim>,
  tick_offset: number
): Type.Maybe<Type.BattleHpAnim> {
  if (!hp_anim || tick_offset === 0) {
    return hp_anim;
  }
  return {
    ...hp_anim,
    start_tick: shift_tick_value(hp_anim.start_tick, tick_offset)
  };
}

function shift_battle_capture_ticks(
  capture: Type.Maybe<Type.BattleCapture>,
  tick_offset: number
): Type.Maybe<Type.BattleCapture> {
  if (!capture || tick_offset === 0) {
    return capture;
  }
  return {
    ...capture,
    start_tick: shift_tick_value(capture.start_tick, tick_offset)
  };
}

function shift_battle_ticks(
  battle: Type.Maybe<Type.Battle>,
  tick_offset: number
): Type.Maybe<Type.Battle> {
  if (!battle || tick_offset === 0) {
    return battle;
  }
  return {
    ...battle,
    anim: shift_battle_anim_ticks(battle.anim, tick_offset),
    hp_anim: shift_battle_hp_ticks(battle.hp_anim, tick_offset),
    capture: shift_battle_capture_ticks(battle.capture, tick_offset)
  };
}

function shift_player_ticks(
  player: Type.PlayerState,
  tick_offset: number
): Type.PlayerState {
  if (tick_offset === 0) {
    return player;
  }
  return {
    ...player,
    dialog: shift_dialog_ticks(player.dialog, tick_offset),
    battle: shift_battle_ticks(player.battle, tick_offset)
  };
}

function shift_entity_ticks(
  entity: Type.Entity,
  tick_offset: number
): Type.Entity {
  if (tick_offset === 0) {
    return entity;
  }
  return {
    ...entity,
    last_tick: shift_tick_value(entity.last_tick, tick_offset),
    turn_tick: shift_tick_value(entity.turn_tick, tick_offset)
  };
}

// Blend one local player's prediction over the stable remote timeline.
export function smooth_player_prediction(
  remote_state: Type.State,
  local_state: Type.State,
  pid: string
): Type.State {
  const tick_offset = local_state.tick - remote_state.tick;
  const local_player = local_state.players[pid];
  if (!local_player) {
    return remote_state;
  }
  const local_player_shifted = shift_player_ticks(local_player, tick_offset);

  let map = remote_state.map;
  const remote_player = remote_state.players[pid];
  if (remote_player) {
    const remote_tile = Map.get(map, remote_player.player_pos);
    if (remote_tile && remote_tile.entity && remote_tile.entity.name === "Player") {
      map = Map.set(map, remote_player.player_pos, {
        ...remote_tile,
        entity: null
      });
    }
  }

  const local_tile = Map.get(local_state.map, local_player.player_pos);
  const target_tile = Map.get(map, local_player.player_pos);
  if (local_tile && local_tile.entity && target_tile) {
    const local_entity = shift_entity_ticks(local_tile.entity, tick_offset);
    map = Map.set(map, local_player.player_pos, {
      ...target_tile,
      entity: local_entity
    });
  }

  const players: Type.Players = {
    ...remote_state.players,
    [pid]: local_player_shifted
  };

  return { ...remote_state, map, players };
}
