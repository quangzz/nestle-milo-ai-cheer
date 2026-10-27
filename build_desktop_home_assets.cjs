const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function unfilterPNG(width, height, rawData) {
  const bpp = 4;
  const stride = 1 + width * bpp;
  const pixels = Buffer.alloc(width * height * bpp);
  for (let y = 0; y < height; y++) {
    const filterType = rawData[y * stride];
    const rowOffset = y * stride + 1;
    const prevRow = y > 0 ? pixels.subarray((y - 1) * width * bpp, y * width * bpp) : null;
    const currRow = pixels.subarray(y * width * bpp, (y + 1) * width * bpp);
    for (let x = 0; x < width * bpp; x++) {
      const raw = rawData[rowOffset + x];
      const a = x >= bpp ? currRow[x - bpp] : 0;
      const b = prevRow ? prevRow[x] : 0;
      const c = (prevRow && x >= bpp) ? prevRow[x - bpp] : 0;
      let val = 0;
      if (filterType === 0) val = raw;
      else if (filterType === 1) val = (raw + a) & 0xff;
      else if (filterType === 2) val = (raw + b) & 0xff;
      else if (filterType === 3) val = (raw + Math.floor((a + b) / 2)) & 0xff;
      else if (filterType === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        let pr = c;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        val = (raw + pr) & 0xff;
      }
      currRow[x] = val;
    }
  }
  return pixels;
}

function decode(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width, height, idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); }
    else if (type === 'IDAT') idatChunks.push(data);
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  return { width, height, pixels: unfilterPNG(width, height, raw) };
}

function encode(width, height, pixels) {
  const bpp = 4;
  const stride = 1 + width * bpp;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < width * bpp; x++) {
      raw[y * stride + 1 + x] = pixels[y * width * bpp + x];
    }
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  function createChunk(type, data) {
    const buf = Buffer.alloc(12 + data.length);
    buf.writeUInt32BE(data.length, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c;
    }
    let crc = 0xffffffff;
    const toCrc = buf.slice(4, 8 + data.length);
    for (let i = 0; i < toCrc.length; i++) crc = crcTable[(crc ^ toCrc[i]) & 0xff] ^ (crc >>> 8);
    buf.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + data.length);
    return buf;
  }
  return Buffer.concat([signature, createChunk('IHDR', ihdrData), createChunk('IDAT', zlib.deflateSync(raw)), createChunk('IEND', Buffer.alloc(0))]);
}

function layerOnto(bg, fg, startX, startY) {
  for (let y = 0; y < fg.height; y++) {
    for (let x = 0; x < fg.width; x++) {
      const bgX = startX + x;
      const bgY = startY + y;
      if (bgX >= 0 && bgX < bg.width && bgY >= 0 && bgY < bg.height) {
        const fgIdx = (y * fg.width + x) * 4;
        const bgIdx = (bgY * bg.width + bgX) * 4;
        const fgA = fg.pixels[fgIdx + 3] / 255;
        if (fgA > 0) {
          const bgA = bg.pixels[bgIdx + 3] / 255;
          const outA = fgA + bgA * (1 - fgA);
          if (outA > 0) {
            bg.pixels[bgIdx] = Math.round((fg.pixels[fgIdx] * fgA + bg.pixels[bgIdx] * bgA * (1 - fgA)) / outA);
            bg.pixels[bgIdx + 1] = Math.round((fg.pixels[fgIdx + 1] * fgA + bg.pixels[bgIdx + 1] * bgA * (1 - fgA)) / outA);
            bg.pixels[bgIdx + 2] = Math.round((fg.pixels[fgIdx + 2] * fgA + bg.pixels[bgIdx + 2] * bgA * (1 - fgA)) / outA);
            bg.pixels[bgIdx + 3] = Math.round(outA * 255);
          }
        }
      }
    }
  }
}

// 1. Build composite "CỔ VŨ MILO" title block for Desktop
const co = decode('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Cổ vũ Milo/Cổ.png');
const vu = decode('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Cổ vũ Milo/Vũ.png');
const milo = decode('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Cổ vũ Milo/Milo.png');

const totalW = co.width + vu.width + milo.width - 25;
const maxH = Math.max(co.height, vu.height, milo.height) + 10;

const covuCanvas = {
  width: totalW,
  height: maxH,
  pixels: Buffer.alloc(totalW * maxH * 4)
};

layerOnto(covuCanvas, co, 0, 0);
layerOnto(covuCanvas, vu, co.width - 12, 10);
layerOnto(covuCanvas, milo, co.width + vu.width - 24, 0);

fs.writeFileSync('e:/milo/public/desktop-covu-milo.png', encode(covuCanvas.width, covuCanvas.height, covuCanvas.pixels));
console.log('Saved desktop-covu-milo.png');

// Copy other desktop 1 elements
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Dịch vụ.png', 'e:/milo/public/desktop-dich-vu.png');
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Graphic/Vector Smart Object.png', 'e:/milo/public/desktop-glove.png');
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Graphic/083d9145-4b0f-4925-b841-8e4b2f80018d-Photoroom.png', 'e:/milo/public/desktop-megaphone.png');
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Graphic/Vector Smart Object-2.png', 'e:/milo/public/desktop-lightning.png');
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/VIỆC GÌ KHÓ, CÓ MILO CỔ VŨ LÀM TỚI CÙNG!.png', 'e:/milo/public/desktop-slogan.png');
fs.copyFileSync('e:/milo/PNG - Desktop-20260814T090915Z-1-001/PNG - Desktop/1/Button - Tạo ngay/Button - Tạo ngay.png', 'e:/milo/public/desktop-btn-taongay.png');

console.log('All Desktop 1 assets prepared!');
