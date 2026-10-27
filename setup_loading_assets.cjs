const fs = require('fs');
const path = require('path');

const srcDir = 'e:/milo/asset mobile/PNG/Loading';
const dstDir = 'e:/milo/public';

const files = fs.readdirSync(srcDir);
const captionFiles = [];

files.forEach(f => {
  if (!f.endsWith('.png')) return;
  const full = path.join(srcDir, f);
  if (f.includes('Ellipse') || f.includes('Group') || f.includes('ChatGPT') || f.includes('Rectangle') || f.includes('50_')) {
    // core asset
  } else {
    captionFiles.push(f);
  }
});

captionFiles.forEach((f, idx) => {
  const dest = path.join(dstDir, `loading-cap-${idx + 1}.png`);
  fs.copyFileSync(path.join(srcDir, f), dest);
  console.log(`Copied caption ${idx + 1}: ${f}`);
});

fs.copyFileSync(path.join(srcDir, 'Group 18.png'), path.join(dstDir, 'loading-ring.png'));
fs.copyFileSync(path.join(srcDir, 'Group 17.png'), path.join(dstDir, 'loading-bar.png'));
fs.copyFileSync(path.join(srcDir, 'Ellipse 2.png'), path.join(dstDir, 'loading-circle-glow.png'));
fs.copyFileSync(path.join(srcDir, 'Ellipse 2 copy.png'), path.join(dstDir, 'loading-circle-half.png'));

console.log('Total captions copied:', captionFiles.length);
