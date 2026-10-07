// Draws the app icon (a black circle on white) as PNGs into public/icons.
// Run: node tools/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/icons/', import.meta.url);
/** Circle diameter as a share of the icon, as in the design's 38px tile / 20px circle. */
const CIRCLE = 20 / 38;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) raw.set(pixel(x, y), y * (size * 4 + 1) + 1 + x * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Share of the pixel inside the circle, by 4×4 supersampling (smooth edge). */
function coverage(size, x, y, diameter) {
  const r = (diameter * size) / 2;
  const c = size / 2;
  let hits = 0;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const dx = x + (i + 0.5) / 4 - c;
    const dy = y + (j + 0.5) / 4 - c;
    if (dx * dx + dy * dy <= r * r) hits++;
  }
  return hits / 16;
}

const icon = size => png(size, (x, y) => { const v = Math.round(255 * (1 - coverage(size, x, y, CIRCLE))); return [v, v, v, 255]; });
// Android shows notification badges as a single-colour silhouette from the alpha channel.
const badge = size => png(size, (x, y) => [255, 255, 255, Math.round(255 * coverage(size, x, y, 0.75))]);

mkdirSync(OUT, { recursive: true });
for (const [name, data] of [
  ['icon-192.png', icon(192)],
  ['icon-512.png', icon(512)],
  ['apple-touch-icon.png', icon(180)],
  ['badge-72.png', badge(72)],
]) writeFileSync(new URL(name, OUT), data);
writeFileSync(new URL('favicon.svg', OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 38"><rect width="38" height="38" rx="9" fill="#fff"/><circle cx="19" cy="19" r="10" fill="#000"/></svg>\n`);
console.log('icons written to public/icons');
