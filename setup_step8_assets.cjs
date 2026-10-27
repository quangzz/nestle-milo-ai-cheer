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

function buildCover(folderName, bannerFile, outFile) {
  const boxFile = `e:/milo/asset mobile/PNG/Generate/Group 40/${folderName}/Cover/Box.png`;
  const charFile = `e:/milo/asset mobile/PNG/Generate/Group 40/${folderName}/Cover/Group 14.png`;
  const confettiFile = `e:/milo/asset mobile/PNG/Generate/Group 40/${folderName}/Cover/Confetti.png`;
  const bannerPath = `e:/milo/asset mobile/PNG/Generate/Group 40/${folderName}/${bannerFile}`;

  const box = decode(boxFile);
  const char = decode(charFile);
  const confetti = decode(confettiFile);
  const banner = decode(bannerPath);

  const canvas = { width: box.width, height: box.height, pixels: Buffer.from(box.pixels) };

  // Layer 1: Confetti
  layerOnto(canvas, confetti, Math.floor((canvas.width - confetti.width) / 2), 10);
  // Layer 2: Character
  layerOnto(canvas, char, Math.floor((canvas.width - char.width) / 2), canvas.height - char.height);
  // Layer 3: Energy to finish banner
  layerOnto(canvas, banner, Math.floor((canvas.width - banner.width) / 2), canvas.height - banner.height - 20);

  fs.writeFileSync(outFile, encode(canvas.width, canvas.height, canvas.pixels));
  console.log('Saved cover:', outFile);
}

buildCover('Office', 'Vector Smart Object copy.png', 'e:/milo/public/cover-office.png');
buildCover('Study', 'Vector Smart Object copy 2.png', 'e:/milo/public/cover-study.png');
buildCover('Workout', 'Vector Smart Object.png', 'e:/milo/public/cover-workout.png');

// Copy 3 buttons from End
fs.copyFileSync('e:/milo/asset mobile/PNG/End/Button copy 6.png', 'e:/milo/public/btn-change-voice.png');
fs.copyFileSync('e:/milo/asset mobile/PNG/End/Button copy 7.png', 'e:/milo/public/btn-create-new.png');
fs.copyFileSync('e:/milo/asset mobile/PNG/End/Button copy 8.png', 'e:/milo/public/btn-download.png');
console.log('Copied all 3 End buttons!');
