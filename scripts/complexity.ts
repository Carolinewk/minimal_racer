import * as fs from "fs";
import * as path from "path";

const import_re =
  /(?:^|\n)\s*(?:import|export)\s+(?:[^'"]*from\s+)?["']([^"']+)["']/g;
const dyn_re = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

// Read a file as UTF-8 text.
function read_text(file_path: string): string {
  return fs.readFileSync(file_path, "utf8");
}

// Find import specifiers in a TypeScript module.
function find_imports(text: string): string[] {
  const specs = new Set<string>();
  let match: RegExpExecArray | null = null;

  import_re.lastIndex = 0;
  while (true) {
    match = import_re.exec(text);
    if (!match) {
      break;
    }
    specs.add(match[1]);
  }

  dyn_re.lastIndex = 0;
  while (true) {
    match = dyn_re.exec(text);
    if (!match) {
      break;
    }
    specs.add(match[1]);
  }

  return Array.from(specs);
}

// Resolve a relative import against a file.
function resolve_import(from_path: string, spec: string): string {
  if (!spec.startsWith(".")) {
    return "";
  }

  const base_dir = path.dirname(from_path);
  const target = path.resolve(base_dir, spec);
  if (path.extname(target)) {
    if (fs.existsSync(target)) {
      return target;
    }
    return "";
  }

  const with_ext = target + ".ts";
  if (fs.existsSync(with_ext)) {
    return with_ext;
  }

  const with_index = path.join(target, "index.ts");
  if (fs.existsSync(with_index)) {
    return with_index;
  }

  return "";
}

// Collect text from a file and all of its relative imports.
function collect_sources(entry_path: string): string {
  const visited = new Set<string>();
  const stack: string[] = [entry_path];
  const chunks: string[] = [];

  while (stack.length > 0) {
    const file_path = stack.pop() as string;
    const abs_path = path.resolve(file_path);
    if (visited.has(abs_path)) {
      continue;
    }
    visited.add(abs_path);
    const text = read_text(abs_path);
    chunks.push(text);
    const specs = find_imports(text);
    for (const spec of specs) {
      const resolved = resolve_import(abs_path, spec);
      if (resolved) {
        stack.push(resolved);
      }
    }
  }

  return chunks.join("");
}

// Count non-comment, non-whitespace characters.
function count_code(text: string): number {
  const stack: any[] = [];
  stack.push({ kind: "code", depth: 0, quote: "" });

  let count = 0;
  let i = 0;
  while (i < text.length) {
    const ctx = stack[stack.length - 1];
    const ch = text[i];
    let nxt = "";
    if (i + 1 < text.length) {
      nxt = text[i + 1];
    }

    if (ctx.kind === "code") {
      if (ch === "'" || ch === "\"") {
        count += 1;
        stack.push({ kind: "string", depth: 0, quote: ch });
        i += 1;
        continue;
      }
      if (ch === "`") {
        count += 1;
        stack.push({ kind: "template", depth: 0, quote: "" });
        i += 1;
        continue;
      }
      if (ch === "/" && nxt === "/") {
        stack.push({ kind: "line", depth: 0, quote: "" });
        i += 2;
        continue;
      }
      if (ch === "/" && nxt === "*") {
        stack.push({ kind: "block", depth: 0, quote: "" });
        i += 2;
        continue;
      }
      if (ch.trim() === "") {
        i += 1;
        continue;
      }
      if (ctx.depth > 0 && ch === "{") {
        ctx.depth += 1;
        count += 1;
        i += 1;
        continue;
      }
      if (ctx.depth > 0 && ch === "}") {
        ctx.depth -= 1;
        count += 1;
        i += 1;
        if (ctx.depth === 0) {
          stack.pop();
        }
        continue;
      }
      count += 1;
      i += 1;
      continue;
    }

    if (ctx.kind === "line") {
      if (ch === "\n") {
        stack.pop();
      }
      i += 1;
      continue;
    }

    if (ctx.kind === "block") {
      if (ch === "*" && nxt === "/") {
        stack.pop();
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (ctx.kind === "string") {
      count += 1;
      if (ch === "\\") {
        if (nxt !== "") {
          count += 1;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }
      if (ch === ctx.quote) {
        stack.pop();
      }
      i += 1;
      continue;
    }

    if (ctx.kind === "template") {
      count += 1;
      if (ch === "\\") {
        if (nxt !== "") {
          count += 1;
          i += 2;
          continue;
        }
        i += 1;
        continue;
      }
      if (ch === "`") {
        stack.pop();
        i += 1;
        continue;
      }
      if (ch === "$" && nxt === "{") {
        count += 1;
        count += 1;
        stack.push({ kind: "code", depth: 1, quote: "" });
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    count += 1;
    i += 1;
  }

  return count;
}

// Run the complexity calculation for a single entry file.
function run(): void {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stderr.write("Usage: bun scripts/complexity.ts <file>\n");
    process.exit(1);
  }

  const entry_path = path.resolve(args[0]);
  const source = collect_sources(entry_path);
  const size = count_code(source);
  process.stdout.write(String(size) + "\n");
}

run();
