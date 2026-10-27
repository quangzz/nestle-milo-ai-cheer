const { execSync } = require('child_process');
const path = require('path');

const publicDir = 'E:/milo/public/samples';
const materialDir = 'E:/milo/MILO-20260815T030710Z-1-001/MILO';
const baseAudioPath = path.join(materialDir, 'milo_material/voice/01/voice_base/study_voice_base.mp3');

const list = [
  'new_key_01_Nam_Tram_Chi_Phien',
  'new_key_02_Nu_Manh_Me_Mom_Angry',
  'new_key_03_Nu_Dieu_Freya',
  'new_key_04_Chipmunk_Lulu_Lolipop'
];

for (const name of list) {
  const introPath = path.join(publicDir, `${name}.mp3`);
  const fullPath = path.join(publicDir, `full_${name}.mp3`);
  const cmd = `ffmpeg -y -i "${introPath}" -i "${baseAudioPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[outa]" -map "[outa]" -c:a libmp3lame -b:a 192k "${fullPath}"`;
  execSync(cmd);
  console.log('Mixed:', fullPath);
}

console.log('ALL NEW KEY SAMPLES MIXED SUCCESSFULLY!');
