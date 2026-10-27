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

function scaleImage(img, scale) {
  const newW = Math.round(img.width * scale);
  const newH = Math.round(img.height * scale);
  const newPixels = Buffer.alloc(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcX = Math.min(img.width - 1, Math.floor(x / scale));
      const srcY = Math.min(img.height - 1, Math.floor(y / scale));
      const srcIdx = (srcY * img.width + srcX) * 4;
      const dstIdx = (y * newW + x) * 4;
      newPixels[dstIdx] = img.pixels[srcIdx];
      newPixels[dstIdx + 1] = img.pixels[srcIdx + 1];
      newPixels[dstIdx + 2] = img.pixels[srcIdx + 2];
      newPixels[dstIdx + 3] = img.pixels[srcIdx + 3];
    }
  }
  return { width: newW, height: newH, pixels: newPixels };
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

function buildOfficeCover() {
  const box = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Office/Cover/Box.png');
  const rawSilhouette = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Office/Cover/Group 14 (merged).png');
  const rawChar = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Office/Cover/Group 14.png');
  const confetti = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Office/Cover/Confetti.png');
  const rawBanner = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Office/Vector Smart Object copy.png');

  // Scale character to ~88% so it fits comfortably within the box
  const char = scaleImage(rawChar, 0.88);
  const greenSilhouette = scaleImage(rawSilhouette, 0.88);
  const banner = scaleImage(rawBanner, 0.92);

  const headProtrusion = 36;
  const canvasWidth = box.width + 16;
  const canvasHeight = box.height + headProtrusion;

  const canvas = {
    width: canvasWidth,
    height: canvasHeight,
    pixels: Buffer.alloc(canvasWidth * canvasHeight * 4)
  };

  const boxX = Math.floor((canvasWidth - box.width) / 2);
  const boxY = headProtrusion;

  // 1. Layer Box
  layerOnto(canvas, box, boxX, boxY);

  // 2. Layer Confetti
  const confettiX = Math.floor((canvasWidth - confetti.width) / 2);
  layerOnto(canvas, confetti, confettiX, boxY + 8);

  // 3. Layer Green Silhouette (offset slightly to the left/up for 3D outline)
  const charX = Math.floor((canvasWidth - char.width) / 2);
  const charY = 6;
  layerOnto(canvas, greenSilhouette, charX - 3, charY - 2);

  // 4. Layer Character
  layerOnto(canvas, char, charX, charY);

  // 5. Layer Energy To Finish Banner
  const bannerX = Math.floor((canvasWidth - banner.width) / 2);
  const bannerY = canvasHeight - banner.height - 18;
  layerOnto(canvas, banner, bannerX, bannerY);

  fs.writeFileSync('e:/milo/public/cover-office.png', encode(canvasWidth, canvasHeight, canvas.pixels));
  console.log('Office cover built with balanced proportions!');
}

function buildStudyCover() {
  const box = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Study/Cover/Box.png');
  const rawSilhouette = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Study/Cover/Group 14/Layer 33 (merged).png');
  const rawChar = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Study/Cover/Group 14.png');
  const confetti = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Study/Cover/Confetti.png');
  const rawBanner = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Study/Vector Smart Object copy 2.png');

  const char = scaleImage(rawChar, 0.88);
  const greenSilhouette = scaleImage(rawSilhouette, 0.88);
  const banner = scaleImage(rawBanner, 0.92);

  const headProtrusion = 36;
  const canvasWidth = box.width + 16;
  const canvasHeight = box.height + headProtrusion;

  const canvas = {
    width: canvasWidth,
    height: canvasHeight,
    pixels: Buffer.alloc(canvasWidth * canvasHeight * 4)
  };

  const boxX = Math.floor((canvasWidth - box.width) / 2);
  const boxY = headProtrusion;

  layerOnto(canvas, box, boxX, boxY);
  layerOnto(canvas, confetti, Math.floor((canvasWidth - confetti.width) / 2), boxY + 8);
  const charX = Math.floor((canvasWidth - char.width) / 2);
  const charY = 6;
  layerOnto(canvas, greenSilhouette, charX - 3, charY - 2);
  layerOnto(canvas, char, charX, charY);
  layerOnto(canvas, banner, Math.floor((canvasWidth - banner.width) / 2), canvasHeight - banner.height - 18);

  fs.writeFileSync('e:/milo/public/cover-study.png', encode(canvasWidth, canvasHeight, canvas.pixels));
  console.log('Study cover built with balanced proportions!');
}

function buildWorkoutCover() {
  const box = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Workout/Cover/Box.png');
  const rawSilhouette = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Workout/Cover/Group 14/Screenshot 2026-08-06 at 14.35.20-Photoroom (merged).png');
  const rawChar = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Workout/Cover/Group 14.png');
  const confetti = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Workout/Cover/Confetti.png');
  const rawBanner = decode('e:/milo/asset mobile/PNG/Generate/Group 40/Workout/Vector Smart Object.png');

  const char = scaleImage(rawChar, 0.88);
  const greenSilhouette = scaleImage(rawSilhouette, 0.88);
  const banner = scaleImage(rawBanner, 0.92);

  const headProtrusion = 36;
  const canvasWidth = box.width + 16;
  const canvasHeight = box.height + headProtrusion;

  const canvas = {
    width: canvasWidth,
    height: canvasHeight,
    pixels: Buffer.alloc(canvasWidth * canvasHeight * 4)
  };

  const boxX = Math.floor((canvasWidth - box.width) / 2);
  const boxY = headProtrusion;

  layerOnto(canvas, box, boxX, boxY);
  layerOnto(canvas, confetti, Math.floor((canvasWidth - confetti.width) / 2), boxY + 8);
  const charX = Math.floor((canvasWidth - char.width) / 2);
  const charY = 6;
  layerOnto(canvas, greenSilhouette, charX - 3, charY - 2);
  layerOnto(canvas, char, charX, charY);
  layerOnto(canvas, banner, Math.floor((canvasWidth - banner.width) / 2), canvasHeight - banner.height - 18);

  fs.writeFileSync('e:/milo/public/cover-workout.png', encode(canvasWidth, canvasHeight, canvas.pixels));
  console.log('Workout cover built with balanced proportions!');
}

buildOfficeCover();
buildStudyCover();
buildWorkoutCover();
