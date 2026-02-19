import * as Path from "path";

const public_dir = Path.join(import.meta.dir, "..", "public");

// Convert a request pathname into a safe relative path.
function safe_pathname(pathname: string): string | null {
  if (pathname.includes("..")) {
    return null;
  }
  return pathname.replace(/^\/+/, "");
}

// Build a not found response.
function not_found(): Response {
  return new Response("Not found", { status: 404 });
}

// Check if the request comes from localhost.
function is_localhost(req: Request): boolean {
  const host = new URL(req.url).hostname;
  return host === "localhost"
    || host === "127.0.0.1"
    || host === "::1";
}

// No-cache headers for local development.
const no_cache_headers: Record<string, string> = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

// Handle incoming HTTP requests.
async function handle_request(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    pathname = "/index.html";
  }

  const rel = safe_pathname(pathname);
  if (!rel) {
    return not_found();
  }

  const file = Bun.file(Path.join(public_dir, rel));
  if (await file.exists()) {
    const headers = is_localhost(req)
      ? no_cache_headers
      : {};
    return new Response(file, { headers });
  }

  return not_found();
}

const server = Bun.serve({
  port: 4003,
  fetch: handle_request
});

console.log(`Server running at http://localhost:${server.port}`);
