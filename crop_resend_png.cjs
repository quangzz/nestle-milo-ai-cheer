const fs = require('fs');
const zlib = require('zlib');

function decodePNG(buffer) {
  let pos = 8;
  let width, height, bitDepth, colorType;
  let idatChunks = [];

  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    }
  }

  const rawData = zlib.inflateSync(Buffer.concat(idatChunks));
  return { width, height, bitDepth, colorType, rawData };
}

function encodePNG(width, height, rawData) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.slice(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Read original PNG
const srcBuf = fs.readFileSync('e:/milo/public/resend-otp-label.png');
const { width, height, rawData } = decodePNG(srcBuf);

console.log(`Original: ${width}x${height}`);

// RGBA (4 bytes per pixel) + 1 filter byte per row
const srcStride = 1 + width * 4;

// Let's inspect column by column to find where 'sau' ends and '(' starts
// Let's scan columns around x = 60 to 80
for (let x = 55; x < 85; x++) {
  let hasPixel = false;
  for (let y = 0; y < height - 3; y++) { // exclude bottom underline
    const idx = y * srcStride + 1 + x * 4;
    const a = rawData[idx + 3];
    if (a > 50) hasPixel = true;
  }
  console.log(`x=${x}: hasPixel=${hasPixel}`);
}

// Let's crop at the gap between "sau" and "("
// Let's create cropped PNG with width = 67 (or optimal gap)
const cropWidth = 66;
const newStride = 1 + cropWidth * 4;
const newRaw = Buffer.alloc(height * newStride);

for (let y = 0; y < height; y++) {
  newRaw[y * newStride] = 0; // Filter None
  for (let x = 0; x < cropWidth; x++) {
    const srcIdx = y * srcStride + 1 + x * 4;
    const dstIdx = y * newStride + 1 + x * 4;
    newRaw[dstIdx] = rawData[srcIdx];
    newRaw[dstIdx + 1] = rawData[srcIdx + 1];
    newRaw[dstIdx + 2] = rawData[srcIdx + 2];
    newRaw[dstIdx + 3] = rawData[srcIdx + 3];
  }
}

const outBuf = encodePNG(cropWidth, height, newRaw);
fs.writeFileSync('e:/milo/public/resend-prefix.png', outBuf);
console.log('Saved e:/milo/public/resend-prefix.png with width=' + cropWidth);
