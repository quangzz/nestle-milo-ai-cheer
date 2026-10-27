const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { execFile, execFileSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Thư mục lưu trữ Cache tập trung cho Voice AI và Mixed Audio (Tránh gọi ElevenLabs lặp lại & tránh tốn CPU FFmpeg)
const CACHE_DIR = path.join(__dirname, '../cache');
const VOICE_CACHE_DIR = path.join(CACHE_DIR, 'voice_intros');
const MIXED_AUDIO_CACHE_DIR = path.join(CACHE_DIR, 'mixed_audios');

[CACHE_DIR, VOICE_CACHE_DIR, MIXED_AUDIO_CACHE_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * CẤU HÌNH VOICE TỪ FILE vioce.xlsx
 * 01: Milo demo (6ahsQwoOO2esg18y97pC) - [low-pitched] [raspy] [gravelly] [mischievously] [animated] [fast-paced] {NAME} ơi cố lên!
 * 02: Mom angry (TW71XpDdXLv7CExa5tEw) - [older female voice] [harsh] [scolding] [angry] [rapid-fire] [shouting] {NAME} ơi cố lên!
 * 03: Freya (rXOGzMiqbmjugMpzKMEx) - [high-pitched] [excited] [playful] [rushed] {NAME} ơi cố lên!
 * 04: Lulu Lolipop (ocZQ262SsZb9RIxcQBOj) - [high-pitched] [childlike] [rapid-fire] {NAME} ơi cố lên!
 */
const VOICE_CONFIGS = {
  '01': {
    id: '01',
    name: 'Milo demo (Nam trầm chị Phiến)',
    voiceId: '6ahsQwoOO2esg18y97pC',
    fallbackVoiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
    model: 'eleven_v3',
    stability: 0.50,
    promptTemplate: '{NAME} ơi cố lên!',
    pitchShift: 'asetrate=44100*0.95,aresample=44100'
  },
  '02': {
    id: '02',
    name: 'Mom angry (Nữ mạnh mẽ)',
    voiceId: 'TW71XpDdXLv7CExa5tEw',
    fallbackVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    model: 'eleven_v3',
    stability: 0.50,
    promptTemplate: '{NAME} ơi cố lên!',
    pitchShift: 'asetrate=44100*1.05,aresample=44100'
  },
  '03': {
    id: '03',
    name: 'Freya (Nữ điệu ngọt ngào)',
    voiceId: 'rXOGzMiqbmjugMpzKMEx',
    fallbackVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    model: 'eleven_v3',
    stability: 0.50,
    promptTemplate: '{NAME} ơi cố lên!',
    pitchShift: 'asetrate=44100*1.15,aresample=44100'
  },
  '04': {
    id: '04',
    name: 'Lulu Lolipop (Chipmunk)',
    voiceId: 'ocZQ262SsZb9RIxcQBOj',
    fallbackVoiceId: 'ErXwobaYiN019PkySvjV', // Antoni
    model: 'eleven_v3',
    stability: 0.50,
    promptTemplate: '{NAME} ơi cố lên!',
    pitchShift: 'asetrate=44100*1.30,aresample=44100'
  }
};

/**
 * Trích xuất tên cuối của người dùng (tối đa 6-8 ký tự, chỉ chữ cái và số, chống Injection)
 */
function extractLastName(fullName) {
  if (!fullName || typeof fullName !== 'string') return 'Quang';
  const parts = fullName.trim().split(/\s+/);
  const rawLast = parts[parts.length - 1] || 'Quang';
  // Loại bỏ mọi ký tự shell, quotes, dấu ngoặc, chỉ giữ lại chữ cái và số
  const sanitized = rawLast.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8);
  return sanitized || 'Bạn';
}

/**
 * Tạo voice intro AI từ ElevenLabs
 */
async function generateVoiceIntro(lastName, voiceKey, jobLogger) {
  const selectedVoice = VOICE_CONFIGS[voiceKey] || VOICE_CONFIGS['01'];
  const promptText = selectedVoice.promptTemplate.replace('{NAME}', lastName);
  const rawIntroPath = path.join(jobLogger.jobDir, 'voice_intro_raw.mp3');
  const outputIntroPath = path.join(jobLogger.jobDir, 'voice_intro.mp3');

  // 0. KIỂM TRA IN-CODE CACHE: Nếu đã từng sinh giọng này cho tên này, trả về ngay lập tức (0ms, 0 API calls)
  const normalizedName = lastName.trim().toLowerCase().normalize('NFC');
  const nameHash = crypto.createHash('md5').update(`${voiceKey}_${normalizedName}`).digest('hex').substring(0, 8);
  const cleanNameAscii = lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const cacheFileName = `intro_${voiceKey}_${cleanNameAscii}_${nameHash}.mp3`;
  const cachedVoicePath = path.join(VOICE_CACHE_DIR, cacheFileName);

  if (fs.existsSync(cachedVoicePath) && fs.statSync(cachedVoicePath).size > 1000) {
    fs.copyFileSync(cachedVoicePath, outputIntroPath);
    jobLogger.log(`[VOICE_GEN_CACHED] Sử dụng Voice Intro từ Disk Cache (${cacheFileName})`);
    console.log(`[DEBUG][voiceService] HIT CACHE Voice Intro: ${cacheFileName} (0ms, tiết kiệm API ElevenLabs)`);
    return {
      audioPath: outputIntroPath,
      text: promptText,
      voiceName: selectedVoice.name,
      isFallback: false,
      fromCache: true
    };
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    const err = new Error('Chưa cấu hình ELEVENLABS_API_KEY trong biến môi trường (.env)');
    jobLogger.setError(err);
    throw err;
  }
  jobLogger.log(`[VOICE_GEN] Starting TTS for name: "${lastName}", Voice: ${selectedVoice.name} (ID: ${selectedVoice.voiceId})`);

  let audioBuffer = null;
  const startTime = Date.now();

  // 1. Thử gọi ElevenLabs với Primary Voice ID (từ vioce.xlsx)
  try {
    jobLogger.log(`[VOICE_GEN] Trying Primary Voice ID: ${selectedVoice.voiceId}`);
    const resp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.voiceId}?output_format=mp3_44100_128`,
      {
        text: promptText,
        model_id: selectedVoice.model,
        voice_settings: {
          stability: selectedVoice.stability || 0.30,
          similarity_boost: 0.80,
          style: 0.50,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer',
        timeout: 15000
      }
    );
    audioBuffer = Buffer.from(resp.data);
    jobLogger.log(`[VOICE_GEN_SUCCESS] Generated with Primary Voice ID in ${Date.now() - startTime}ms`);
  } catch (primaryErr) {
    const errReason = primaryErr.response?.data ? Buffer.from(primaryErr.response.data).toString() : primaryErr.message;
    jobLogger.log(`[VOICE_GEN_WARN] Primary Voice ID failed (${errReason}). Fallback to Default Voice ID + Prompt Tags...`);

    // 2. Thử Fallback Voice ID với Prompt Tags từ vioce.xlsx
    try {
      const respFallback = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.fallbackVoiceId}?output_format=mp3_44100_128`,
        {
          text: promptText,
          model_id: 'eleven_v3',
          voice_settings: {
            stability: selectedVoice.stability || 0.30,
            similarity_boost: 0.80,
            style: 0.50,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );
      audioBuffer = Buffer.from(respFallback.data);
      jobLogger.log(`[VOICE_GEN_SUCCESS] Generated with Fallback Voice ID in ${Date.now() - startTime}ms`);
    } catch (fallbackErr) {
      jobLogger.log(`[VOICE_GEN_ERROR] Fallback Voice ID failed: ${fallbackErr.message}`);
    }
  }

  // 3. Nếu thành công, áp dụng Filter chỉnh tone đặc trưng (Pitch Shift / Tone Color)
  if (audioBuffer) {
    fs.writeFileSync(rawIntroPath, audioBuffer);
    if (selectedVoice.pitchShift) {
      try {
        execFileSync('ffmpeg', ['-y', '-i', rawIntroPath, '-af', selectedVoice.pitchShift, '-c:a', 'libmp3lame', '-b:a', '192k', outputIntroPath]);
      } catch (ffErr) {
        fs.copyFileSync(rawIntroPath, outputIntroPath);
      }
    } else {
      fs.copyFileSync(rawIntroPath, outputIntroPath);
    }

    // Lưu vào In-Code Cache để tái sử dụng ngay cho các lượt sau
    try {
      fs.copyFileSync(outputIntroPath, cachedVoicePath);
      console.log(`[DEBUG][voiceService] Đã lưu Voice Intro vào Cache: ${cacheFileName}`);
    } catch (_) {}

    return {
      audioPath: outputIntroPath,
      text: promptText,
      voiceName: selectedVoice.name,
      isFallback: false
    };
  }

  // 3.5. Nếu ElevenLabs thất bại, kích hoạt Edge-TTS AI để đọc tên thật "{NAME} ơi cố lên!" thay vì copy audio demo câm tên
  try {
    jobLogger.log(`[VOICE_GEN_EDGE_TTS] ElevenLabs không khả dụng. Khởi chạy Edge-TTS AI đọc tên: "${lastName}"...`);
    console.log(`[DEBUG][voiceService] ElevenLabs thất bại, kích hoạt Edge-TTS AI đọc tên: "${lastName}"...`);
    const edgeVoice = {
      '01': 'vi-VN-NamMinhNeural',
      '02': 'vi-VN-HoaiMyNeural',
      '03': 'vi-VN-HoaiMyNeural',
      '04': 'vi-VN-HoaiMyNeural'
    }[voiceKey] || 'vi-VN-NamMinhNeural';

    const edgeTtsScript = path.join(__dirname, 'generate_tts_edge.py');
    execFileSync('python', [edgeTtsScript, promptText, edgeVoice, rawIntroPath], { timeout: 15000 });

    if (fs.existsSync(rawIntroPath) && fs.statSync(rawIntroPath).size > 1000) {
      if (selectedVoice.pitchShift) {
        try {
          execFileSync('ffmpeg', ['-y', '-i', rawIntroPath, '-af', selectedVoice.pitchShift, '-c:a', 'libmp3lame', '-b:a', '192k', outputIntroPath]);
        } catch {
          fs.copyFileSync(rawIntroPath, outputIntroPath);
        }
      } else {
        fs.copyFileSync(rawIntroPath, outputIntroPath);
      }

      jobLogger.log(`[VOICE_GEN_EDGE_TTS_SUCCESS] Đã tạo thành công giọng đọc tên AI cho "${lastName}" qua Edge-TTS`);
      console.log(`[DEBUG][voiceService] Đã tạo thành công voice intro AI cho "${lastName}" qua Edge-TTS`);

      try {
        fs.copyFileSync(outputIntroPath, cachedVoicePath);
        console.log(`[DEBUG][voiceService] Đã lưu Edge-TTS Voice Intro vào Cache: ${cacheFileName}`);
      } catch (_) {}

      return {
        audioPath: outputIntroPath,
        text: promptText,
        voiceName: `${selectedVoice.name} (Edge-TTS AI)`,
        isFallback: false
      };
    }
  } catch (edgeErr) {
    jobLogger.log(`[VOICE_GEN_EDGE_TTS_ERROR] Edge-TTS thất bại: ${edgeErr.message}`);
    console.warn(`[DEBUG][voiceService] Edge-TTS error:`, edgeErr.message);
  }

  // 4. Nếu toàn bộ API thất bại, dùng Demo MP3
  const materialDir = process.env.MATERIAL_DIR || path.join(__dirname, '../MILO-20260815T030710Z-1-001/MILO');
  const demoDir = path.join(materialDir, '[26-MILO] voice demo');
  let fallbackAudio = null;

  if (fs.existsSync(demoDir)) {
    const files = [];
    const findMp3 = (dir) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) findMp3(full);
        else if (item.endsWith('.mp3')) files.push(full);
      }
    };
    findMp3(demoDir);
    
    // Tìm file demo khớp với tone giọng đã chọn (tránh lấy nhầm Chipmunk cho Nam trầm)
    const voiceKeywords = {
      '01': ['nam', 'tram'],
      '02': ['nu', 'manhme'],
      '03': ['freya', 'nu'],
      '04': ['chipmunk']
    }[voiceKey] || ['nam'];

    const matchedFile = files.find(f => {
      const lower = f.toLowerCase();
      return voiceKeywords.some(kw => lower.includes(kw));
    });

    fallbackAudio = matchedFile || files[0];
  }

  if (fallbackAudio && fs.existsSync(fallbackAudio)) {
    // Chỉ cắt đúng 1.8s đoạn đầu của demo audio làm intro, tránh việc copy nguyên bài 14s dẫn đến bị nối đè 2 bài hát và lẫn 2 giọng
    try {
      execFileSync('ffmpeg', ['-y', '-i', fallbackAudio, '-t', '1.8', '-c:a', 'libmp3lame', '-b:a', '192k', outputIntroPath]);
    } catch {
      fs.copyFileSync(fallbackAudio, outputIntroPath);
    }
    jobLogger.log(`[VOICE_GEN_FALLBACK] Trimmed 1.8s demo voice from ${fallbackAudio}`);
    return {
      audioPath: outputIntroPath,
      text: promptText,
      voiceName: selectedVoice.name,
      isFallback: true
    };
  }

  throw new Error(`Không thể tạo voice intro.`);
}

/**
 * Nối audio intro với nhạc nền tương ứng (Có In-Code Cache theo topic + voiceKey + lastName)
 */
function concatenateAudio(introAudioPath, voiceKey, topic = 'WORK', jobLogger, lastName = '') {
  return new Promise((resolve, reject) => {
    const materialDir = process.env.MATERIAL_DIR || path.join(__dirname, '../../MILO-20260815T030710Z-1-001/MILO');
    let baseAudioName = 'study_voice_base.mp3';

    if (topic === 'WORK' || topic === 'Office') {
      baseAudioName = 'office_voice_base.mp3';
    } else if (topic === 'WORKOUT' || topic === 'Workout') {
      baseAudioName = 'workout_voice_base.mp3';
    }

    const safeVoiceKey = ['01', '02', '03', '04'].includes(voiceKey) ? voiceKey : '01';
    const baseAudioPath = path.join(materialDir, `milo_material/voice/${safeVoiceKey}/voice_base/${baseAudioName}`);
    const mixedAudioPath = path.join(jobLogger.jobDir, 'mixed_audio.mp3');

    // 0. KIỂM TRA IN-CODE CACHE: Nếu đã từng nối audio với bộ 3 (voiceKey, topic, lastName) thì lấy ngay lập tức
    let cachedMixedPath = null;
    let cacheMixFileName = null;
    if (lastName) {
      const normalizedName = lastName.trim().toLowerCase().normalize('NFC');
      const mixHash = crypto.createHash('md5').update(`${safeVoiceKey}_${topic}_${normalizedName}`).digest('hex').substring(0, 8);
      const cleanNameAscii = lastName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      cacheMixFileName = `mixed_${safeVoiceKey}_${topic}_${cleanNameAscii}_${mixHash}.mp3`;
      cachedMixedPath = path.join(MIXED_AUDIO_CACHE_DIR, cacheMixFileName);

      if (fs.existsSync(cachedMixedPath) && fs.statSync(cachedMixedPath).size > 10000) {
        fs.copyFileSync(cachedMixedPath, mixedAudioPath);
        jobLogger.log(`[AUDIO_CONCAT_CACHED] Sử dụng Mixed Audio từ Disk Cache (${cacheMixFileName})`);
        console.log(`[DEBUG][voiceService] HIT CACHE Mixed Audio: ${cacheMixFileName} (0ms, bỏ qua FFmpeg concat)`);
        return resolve(mixedAudioPath);
      }
    }

    jobLogger.log(`[AUDIO_CONCAT] Mixing intro with base audio: ${baseAudioPath}`);

    if (!fs.existsSync(baseAudioPath)) {
      const err = new Error(`Base audio not found: ${baseAudioPath}`);
      jobLogger.setError(err);
      return reject(err);
    }

    const args = [
      '-y',
      '-i', introAudioPath,
      '-i', baseAudioPath,
      '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[outa]',
      '-map', '[outa]',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      mixedAudioPath
    ];

    execFile('ffmpeg', args, (error) => {
      if (error) {
        jobLogger.log(`[AUDIO_CONCAT_ERROR] ${error.message}`);
        return reject(error);
      }
      jobLogger.log(`[AUDIO_CONCAT_SUCCESS] Mixed audio saved to ${mixedAudioPath}`);

      // Lưu vào In-Code Cache cho các lượt tạo tiếp theo
      if (cachedMixedPath && fs.existsSync(mixedAudioPath)) {
        try {
          fs.copyFileSync(mixedAudioPath, cachedMixedPath);
          console.log(`[DEBUG][voiceService] Đã lưu Mixed Audio vào Cache: ${cacheMixFileName}`);
        } catch (_) {}
      }

      resolve(mixedAudioPath);
    });
  });
}

module.exports = {
  VOICE_CONFIGS,
  extractLastName,
  generateVoiceIntro,
  concatenateAudio
};
