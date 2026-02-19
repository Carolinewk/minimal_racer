import * as Const from "../Const";
import * as Type from "../Type";

// Open a dialog state from dialog text.
export function create(
  dialog: Type.DialogText,
  tick: number
): Type.Dialog {
  const cur = { paragraph: 0, line: 0 };
  return { dialog, cursor: cur, last_tick: tick };
}

// Compute the visible dialog slice for the current tick.
export function view(
  state: Type.Dialog,
  tick: number
): Type.DialogView {
  const dialog = state.dialog;
  const cur = state.cursor;
  const para = dialog[cur.paragraph] || [];
  const top = para[cur.line] || "";
  const bot = para[cur.line + 1] || "";
  const top_len = top.length;
  const bot_len = bot.length;
  const ticks = Const.dialog_char_ticks;
  let vis = Math.floor((tick - state.last_tick) / ticks);
  if (vis < 0) {
    vis = 0;
  }

  let top_vis = top_len;
  let bot_vis = 0;
  let done = false;

  if (cur.line === 0) {
    const max = top_len + bot_len;
    if (vis > max) {
      vis = max;
    }
    top_vis = Math.min(top_len, vis);
    bot_vis = Math.max(0, vis - top_len);
    done = vis >= max;
  } else {
    if (vis > bot_len) {
      vis = bot_len;
    }
    bot_vis = vis;
    done = vis >= bot_len;
  }

  return {
    top_ln: top,
    bot_ln: bot,
    top_seen: top_vis,
    bot_seen: bot_vis,
    is_done: done
  };
}

// Advance the dialog cursor or close it if complete.
export function advance(
  state: Type.Dialog,
  tick: number
): Type.Dialog | null {
  const prog = view(state, tick);
  if (!prog.is_done) {
    return state;
  }

  const dialog = state.dialog;
  const cur = state.cursor;
  const next_line = cur.line + 1;
  const para = dialog[cur.paragraph] || [];
  if (next_line + 1 < para.length) {
    const next_cur = { paragraph: cur.paragraph, line: next_line };
    return { dialog, cursor: next_cur, last_tick: tick };
  }

  const next_para = cur.paragraph + 1;
  if (next_para >= dialog.length) {
    return null;
  }
  const next_cur = { paragraph: next_para, line: 0 };
  return { dialog, cursor: next_cur, last_tick: tick };
}
