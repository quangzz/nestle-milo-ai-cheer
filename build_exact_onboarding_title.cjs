const fs = require('fs');
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

function scaleImage(img, targetWidth, targetHeight) {
  const target = {
    width: targetWidth,
    height: targetHeight,
    pixels: Buffer.alloc(targetWidth * targetHeight * 4)
  };
  const xRatio = (img.width - 1) / (targetWidth - 1 || 1);
  const yRatio = (img.height - 1) / (targetHeight - 1 || 1);
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.round(x * xRatio);
      const srcY = Math.round(y * yRatio);
      const srcIdx = (srcY * img.width + srcX) * 4;
      const targetIdx = (y * targetWidth + x) * 4;
      target.pixels[targetIdx] = img.pixels[srcIdx];
      target.pixels[targetIdx + 1] = img.pixels[srcIdx + 1];
      target.pixels[targetIdx + 2] = img.pixels[srcIdx + 2];
      target.pixels[targetIdx + 3] = img.pixels[srcIdx + 3];
    }
  }
  return target;
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

const buoc3 = decode('e:/milo/public/desktop-onboarding-3buoc.png');
const line = decode('e:/milo/public/desktop-onboarding-line.png');
const taobai = decode('e:/milo/public/desktop-onboarding-taobaicovu.png');

// Scale line so its width matches 3 BƯỚC E-ZÌ (buoc3.width + 10)
const scaledLine = scaleImage(line, buoc3.width + 15, Math.round(line.height * 0.8));

const canvasW = Math.max(buoc3.width, taobai.width) + 20;
const canvasH = buoc3.height + scaledLine.height + taobai.height + 15;

const canvas = {
  width: canvasW,
  height: canvasH,
  pixels: Buffer.alloc(canvasW * canvasH * 4)
};

// 1. Draw 3 BƯỚC E-ZÌ centered
const buoc3X = Math.round((canvasW - buoc3.width) / 2);
layerOnto(canvas, buoc3, buoc3X, 0);

// 2. Draw line right underneath 3 BƯỚC E-ZÌ
const lineX = Math.round((canvasW - scaledLine.width) / 2);
const lineY = buoc3.height + 2;
layerOnto(canvas, scaledLine, lineX, lineY);

// 3. Draw TẠO BÀI CỔ VŨ
const taobaiX = Math.round((canvasW - taobai.width) / 2);
const taobaiY = lineY + scaledLine.height + 4;
layerOnto(canvas, taobai, taobaiX, taobaiY);

fs.writeFileSync('e:/milo/public/desktop-onboarding-title-exact.png', encode(canvas.width, canvas.height, canvas.pixels));
console.log('Saved exact title composite: desktop-onboarding-title-exact.png');
