require('dotenv').config();
const path = require('path');
const fs = require('fs');

const { JobLogger } = require('./services/jobLogger');
const { extractLastName, generateVoiceIntro, concatenateAudio } = require('./services/voiceService');
const { processUserAvatar } = require('./services/imageProcessor');
const { composeFinalVideo } = require('./services/videoComposer');

async function testFullPipeline() {
  console.log('=== TEST FULL PIPELINE MILO BACKEND ===');
  const jobId = `test_job_${Date.now()}`;
  const jobLogger = new JobLogger(jobId);

  try {
    // 1. Tên cuối
    const fullName = 'Nguyễn Hoàng Phát';
    const lastName = extractLastName(fullName);
    console.log(`[1] Tên cuối: ${lastName} (Gốc: ${fullName})`);

    // 2. Head image
    const sampleAvatar = path.join(__dirname, '../public/cover-office.png');
    console.log(`[2] Xử lý avatar từ: ${sampleAvatar}`);
    const headPath = await processUserAvatar(sampleAvatar, jobLogger);
    console.log(`[2] Head image tạo thành công: ${headPath}`);

    // 3. Voice intro
    console.log(`[3] Tạo voice intro cho: ${lastName}`);
    const voiceIntro = await generateVoiceIntro(lastName, '01', jobLogger);
    console.log(`[3] Voice intro path: ${voiceIntro.audioPath}`);

    // 4. Mix audio
    console.log(`[4] Nối audio cho chủ đề WORK...`);
    const mixedAudio = await concatenateAudio(voiceIntro.audioPath, '01', 'WORK', jobLogger);
    console.log(`[4] Mixed audio path: ${mixedAudio}`);

    // 5. Compose video
    console.log(`[5] Ghép video bằng FFmpeg...`);
    const videoResult = await composeFinalVideo({
      headImagePath: headPath,
      mixedAudioPath: mixedAudio,
      topic: 'WORK',
      lastName,
      jobLogger
    });
    console.log(`[5] Video thành phẩm tạo thành công: ${videoResult.videoPath}`);

    // 6. Ghi kết quả
    jobLogger.setResult({
      jobId,
      recipientName: lastName,
      topic: 'WORK',
      videoPath: videoResult.videoPath,
      mixedAudioPath: mixedAudio,
      headImagePath: headPath
    });

    console.log(`=== PIPELINE TEST THÀNH CÔNG RỰC RỠ ===`);
    console.log(`Kiểm tra thư mục: ${jobLogger.jobDir}`);
  } catch (err) {
    console.error('Pipeline Test Error:', err);
    jobLogger.setError(err);
  }
}

testFullPipeline();
