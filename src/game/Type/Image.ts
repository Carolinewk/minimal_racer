import * as Type from "../Type";

const image_cache = new Map<Type.Sprite, Type.Image>();

// Resolve an asset path that works for project subpaths (GitHub Pages).
function asset_path(id: Type.Sprite): string {
  if (typeof window === "undefined") {
    return `/assets/${id}.png`;
  }

  const pathname = window.location.pathname;
  if (pathname.endsWith("/")) {
    return `${pathname}assets/${id}.png`;
  }

  if (pathname.includes(".")) {
    const base = pathname.slice(0, pathname.lastIndexOf("/") + 1);
    return `${base}assets/${id}.png`;
  }

  return `${pathname}/assets/${id}.png`;
}

// Get an image element from the cache.
export function get(id: Type.Sprite): Type.Image {
  const existing = image_cache.get(id);
  if (existing) {
    return existing;
  }

  const image = new Image();
  image.src = asset_path(id);
  image_cache.set(id, image);
  return image;
}

// Check whether an image is loaded.
export function ready(image: Type.Image): boolean {
  return image.complete && image.naturalWidth > 0;
}

// Preload a list of sprite ids.
export function preload(target: Type.Sprite[]): void {
  for (const id of target) {
    get(id);
  }
}
