import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicIconsDir = path.resolve(__dirname, "../public/icons");

if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePng(width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);

  const ihdrChunk = createChunk("IHDR", ihdrData);
  const rawBytes = Buffer.alloc(height * (1 + width * 4));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawBytes[pos++] = 0;

    for (let x = 0; x < width; x++) {
      const radius = Math.floor(width * 0.2);
      const isCorner =
        (x < radius && y < radius && Math.hypot(x - radius, y - radius) > radius) ||
        (x >= width - radius && y < radius && Math.hypot(x - (width - radius), y - radius) > radius) ||
        (x < radius && y >= height - radius && Math.hypot(x - radius, y - (height - radius)) > radius) ||
        (x >= width - radius && y >= height - radius && Math.hypot(x - (width - radius), y - (height - radius)) > radius);

      if (isCorner) {
        rawBytes[pos++] = 0;
        rawBytes[pos++] = 0;
        rawBytes[pos++] = 0;
        rawBytes[pos++] = 0;
        continue;
      }

      // Dark Monolith aesthetic (#09090b to #18181b)
      const grad = y / height;
      let r = Math.floor(9 + grad * 15);
      let g = Math.floor(9 + grad * 15);
      let b = Math.floor(11 + grad * 16);
      let a = 255;

      // Orange Cloudflare accent center symbol
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist <= width * 0.28 && dist >= width * 0.15) {
        r = 249;
        g = 115;
        b = 22;
      }

      rawBytes[pos++] = r;
      rawBytes[pos++] = g;
      rawBytes[pos++] = b;
      rawBytes[pos++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawBytes);
  const idatChunk = createChunk("IDAT", deflated);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = makePng(size, size);
  const dest = path.join(publicIconsDir, `icon-${size}.png`);
  fs.writeFileSync(dest, png);
  console.log(`Generated ${dest} (${size}x${size})`);
}
