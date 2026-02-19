#!/usr/bin/env python3

import struct
import sys
import zlib
from pathlib import Path

png_sig = b"\x89PNG\r\n\x1a\n"
levels = [248, 168, 96, 0]


# Pick the nearest grayscale level for an RGB pixel.
def nearest_gray(red: int, grn: int, blu: int) -> int:
  best = levels[0]
  best_dist = -1
  for level in levels:
    dr = red - level
    dg = grn - level
    db = blu - level
    dist = dr * dr + dg * dg + db * db
    if best_dist < 0 or dist < best_dist:
      best = level
      best_dist = dist
  return best


# Paeth predictor helper for PNG filter type 4.
def paeth(a: int, b: int, c: int) -> int:
  p = a + b - c
  pa = abs(p - a)
  pb = abs(p - b)
  pc = abs(p - c)
  if pa <= pb and pa <= pc:
    return a
  if pb <= pc:
    return b
  return c


# Decode raw scanlines from PNG filtered bytes.
def decode_scanlines(raw: bytes, width: int, height: int, bpp: int) -> bytes:
  stride = width * bpp
  src = 0
  prev = bytearray(stride)
  out = bytearray(height * stride)
  dst = 0

  for _ in range(height):
    filt = raw[src]
    src += 1
    scan = bytearray(raw[src:src + stride])
    src += stride
    row = bytearray(stride)

    for idx in range(stride):
      val = scan[idx]
      lf = row[idx - bpp] if idx >= bpp else 0
      up = prev[idx]
      ul = prev[idx - bpp] if idx >= bpp else 0
      if filt == 0:
        res = val
      elif filt == 1:
        res = (val + lf) & 255
      elif filt == 2:
        res = (val + up) & 255
      elif filt == 3:
        res = (val + ((lf + up) >> 1)) & 255
      elif filt == 4:
        res = (val + paeth(lf, up, ul)) & 255
      else:
        raise ValueError(f"PNG filter unsupported: {filt}")
      row[idx] = res

    out[dst:dst + stride] = row
    prev = row
    dst += stride

  return bytes(out)


# Read a PNG and return rgba bytes.
def read_png_rgba(path: Path) -> tuple[int, int, bytes]:
  data = path.read_bytes()
  if not data.startswith(png_sig):
    raise ValueError("Not a PNG file")

  idx = len(png_sig)
  width = 0
  height = 0
  bit_depth = 0
  color_type = 0
  interlace = 0
  idat = bytearray()

  while idx < len(data):
    length = int.from_bytes(data[idx:idx + 4], "big")
    idx += 4
    chunk_type = data[idx:idx + 4]
    idx += 4
    chunk_data = data[idx:idx + length]
    idx += length
    idx += 4

    if chunk_type == b"IHDR":
      vals = struct.unpack(">IIBBBBB", chunk_data)
      width, height, bit_depth, color_type, _, _, interlace = vals
    elif chunk_type == b"IDAT":
      idat.extend(chunk_data)
    elif chunk_type == b"IEND":
      break

  if bit_depth != 8:
    raise ValueError("Only 8-bit PNG is supported")
  if interlace != 0:
    raise ValueError("Interlaced PNG is not supported")
  if color_type not in (2, 6):
    raise ValueError(f"Unsupported PNG color type: {color_type}")

  bpp = 3
  if color_type == 6:
    bpp = 4

  raw = zlib.decompress(bytes(idat))
  decoded = decode_scanlines(raw, width, height, bpp)

  if color_type == 6:
    return width, height, decoded

  rgba = bytearray(width * height * 4)
  src = 0
  dst = 0
  while src < len(decoded):
    red = decoded[src]
    grn = decoded[src + 1]
    blu = decoded[src + 2]
    rgba[dst] = red
    rgba[dst + 1] = grn
    rgba[dst + 2] = blu
    rgba[dst + 3] = 255
    src += 3
    dst += 4

  return width, height, bytes(rgba)


# Build a PNG chunk with computed CRC.
def png_chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
  head = len(chunk_data).to_bytes(4, "big") + chunk_type
  crc = zlib.crc32(chunk_type)
  crc = zlib.crc32(chunk_data, crc) & 0xFFFFFFFF
  return head + chunk_data + crc.to_bytes(4, "big")


# Write rgba bytes to PNG (8-bit rgba, non-interlaced).
def write_png_rgba(path: Path, width: int, height: int, rgba: bytes) -> None:
  stride = width * 4
  raw = bytearray()
  for row in range(height):
    start = row * stride
    end = start + stride
    raw.append(0)
    raw.extend(rgba[start:end])

  ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
  idat = zlib.compress(bytes(raw), 9)

  out = bytearray()
  out.extend(png_sig)
  out.extend(png_chunk(b"IHDR", ihdr))
  out.extend(png_chunk(b"IDAT", idat))
  out.extend(png_chunk(b"IEND", b""))
  path.write_bytes(bytes(out))


# Normalize image colors and transparency.
def normalize_rgba(data: bytes) -> tuple[bytes, int, int]:
  out = bytearray(data)
  pink_to_alpha = 0
  to_gray = 0
  idx = 0
  while idx < len(out):
    red = out[idx]
    grn = out[idx + 1]
    blu = out[idx + 2]
    alp = out[idx + 3]

    if alp == 0:
      idx += 4
      continue

    if red > 100 and blu > 100 and grn < 100:
      out[idx] = 0
      out[idx + 1] = 0
      out[idx + 2] = 0
      out[idx + 3] = 0
      pink_to_alpha += 1
      idx += 4
      continue

    level = nearest_gray(red, grn, blu)
    if red != level or grn != level or blu != level:
      to_gray += 1
    out[idx] = level
    out[idx + 1] = level
    out[idx + 2] = level
    out[idx + 3] = alp
    idx += 4

  return bytes(out), pink_to_alpha, to_gray


# Normalize every PNG in assets/.
def normalize_assets(root: Path) -> int:
  paths = sorted(root.rglob("*.png"))
  if len(paths) == 0:
    print("No PNG files found")
    return 0

  total_files = 0
  total_pink = 0
  total_gray = 0

  for path in paths:
    width, height, rgba = read_png_rgba(path)
    norm, pink_cnt, gray_cnt = normalize_rgba(rgba)
    write_png_rgba(path, width, height, norm)
    total_files += 1
    total_pink += pink_cnt
    total_gray += gray_cnt
    rel = path.as_posix()
    print(
      f"{rel}: pink_to_alpha={pink_cnt} gray_quantized={gray_cnt}"
    )

  print(
    "normalized "
    f"files={total_files} pink_to_alpha={total_pink} "
    f"gray_quantized={total_gray}"
  )
  return 0


# Script entrypoint.
def main() -> int:
  root = Path("assets")
  if len(sys.argv) > 1:
    root = Path(sys.argv[1])
  if not root.exists():
    print(f"Missing assets dir: {root}", file=sys.stderr)
    return 1
  try:
    return normalize_assets(root)
  except Exception as exc:
    print(f"normalize failed: {exc}", file=sys.stderr)
    return 1


if __name__ == "__main__":
  raise SystemExit(main())
