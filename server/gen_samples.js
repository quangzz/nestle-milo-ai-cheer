const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config({ path: path.join(__dirname, '.env') });

const apiKey = process.env.ELEVENLABS_API_KEY;

const voices = [
  { key: '01', id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam_Nam_Tram', text: 'Quang ơi, cố lên! Một, hai! Một, hai!' },
  { key: '02', id: 'ErXwobaYiN019PkySvjV', name: 'Antoni_Nam_NangDong', text: 'Quang ơi, cố lên nào! Một, hai! Một, hai!' },
  { key: '03', id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella_Nu_NgotNgao', text: 'Quang ơi, cố lên nhé! Một, hai! Một, hai!' },
  { key: '04', id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George_Nam_HaoSang', text: 'Quang ơi, ráng lên nha! Một, hai! Một, hai!' }
];

async function generateSampleAudios() {
  const publicDir = path.join(__dirname, '../public/samples');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const materialDir = process.env.MATERIAL_DIR || path.join(__dirname, '../MILO-20260815T030710Z-1-001/MILO');
  const baseAudioPath = path.join(materialDir, 'milo_material/voice/01/voice_base/study_voice_base.mp3');

  for (const v of voices) {
    console.log('Generating voice:', v.name, '...');
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${v.id}`,
      {
        text: v.text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.50,
          similarity_boost: 0.85,
          style: 0.35,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // 1. Lưu file Voice Intro đơn lẻ
    const introPath = path.join(publicDir, `voice_${v.key}_${v.name}.mp3`);
    fs.writeFileSync(introPath, Buffer.from(resp.data));

    // 2. Ghép cùng bài hát Milo Study
    const fullMixedPath = path.join(publicDir, `full_song_${v.key}_${v.name}.mp3`);
    const cmd = `ffmpeg -y -i "${introPath}" -i "${baseAudioPath}" -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1[outa]" -map "[outa]" -c:a libmp3lame -b:a 192k "${fullMixedPath}"`;
    execSync(cmd);

    console.log('Saved:', introPath);
    console.log('Saved full mixed:', fullMixedPath);
  }
  console.log('ALL SAMPLE VOICES GENERATED SUCCESSFULLY!');
}

generateSampleAudios().catch(console.error);
