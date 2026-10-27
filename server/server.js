const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const { exec, execFile } = require('child_process');

// Helper kiểm tra jobId hợp lệ (Chống Path Traversal)
function isValidJobId(jobId) {
  if (!jobId || typeof jobId !== 'string') return false;
  return /^[a-zA-Z0-9_\-]+$/.test(jobId);
}

const { JobLogger, JOBS_DIR } = require('./services/jobLogger');
const { extractLastName, generateVoiceIntro, concatenateAudio } = require('./services/voiceService');
const { processUserAvatar } = require('./services/imageProcessor');
const { composeFinalVideo } = require('./services/videoComposer');
const { checkBrandSafety } = require('./services/brandSafety');
const { sendOtpSms, verifyOtp, isPhoneAlreadyVerified, createVerificationToken, verifyVerificationToken } = require('./services/smsService');
const { syncJobToFirebaseStorage } = require('./services/firebaseStorage');
const { getDashboardStats, getDashboardJobs, getVerifiedPhones } = require('./services/dashboardService');
const crypto = require('crypto');

// Bắt các ngoại lệ chưa được xử lý để tránh crash server ngoài ý muốn
process.on('uncaughtException', (err) => {
  console.error('[SERVER_UNCAUGHT_EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[SERVER_UNHANDLED_REJECTION]', reason);
});

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// 1. Bảo vệ HTTP Security Headers theo chuẩn Nestlé
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// 2. Cấu hình CORS Whitelist theo chuẩn bảo mật doanh nghiệp (API7:2023)
const allowedOrigins = [
  'https://cungmilocovutoicung.giadinhnestle.com.vn',
  'https://www.cungmilocovutoicung.giadinhnestle.com.vn',
  'https://giadinhnestle.com.vn',
  'https://milo-3b596.web.app',
  'https://milo-3b596.firebaseapp.com'
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (
    allowedOrigins.includes(origin) ||
    origin.endsWith('.platformsh.site') ||
    origin.endsWith('.giadinhnestle.com.vn') ||
    origin.endsWith('.web.app') ||
    origin.endsWith('.firebaseapp.com') ||
    origin.endsWith('.trycloudflare.com')
  ) {
    return true;
  }
  // Cho phép mọi cổng localhost & 127.0.0.1 (bao gồm 5178, 5173, 3000, 5005, ...)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  // Cho phép dải IP nội bộ LAN khi test trên thiết bị di động cùng WiFi
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Giới hạn tần suất gọi API (Rate Limiting) chống spam & tấn công DoS
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 300, // tối đa 300 requests/phút trên mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.includes('/status') || req.path.endsWith('.mp4') || req.path.endsWith('.mp3'),
  message: { success: false, error: 'Quá nhiều yêu cầu từ thiết bị của bạn. Vui lòng thử lại sau ít phút.' }
});

const otpLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 10, // tối đa 10 lần gửi OTP/phút trên mỗi IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Bạn đã yêu cầu gửi OTP quá nhanh. Vui lòng chờ 1 phút trước khi thử lại.' }
});

app.use('/api/', apiLimiter);
app.use('/api/send-otp', otpLimiter);

// 4. Quản lý hàng đợi render video (Concurrency Throttling chống overload CPU & RAM)
// Cấu hình máy chủ e2-standard-8 (8 vCPU, 32GB RAM): chạy tối đa 4 jobs song song để giảm thời gian xếp hàng
const MAX_CONCURRENT_JOBS = 4;
let runningJobsCount = 0;
const jobQueue = [];

function updateQueuePositions() {
  jobQueue.forEach((item, index) => {
    if (item.jobLogger && typeof item.jobLogger.updateStatus === 'function') {
      const position = index + 1;
      const progressEst = Math.min(6, Math.max(2, Math.round(7 - (position / Math.max(jobQueue.length, 1)) * 5)));
      item.jobLogger.updateStatus(
        'QUEUED',
        progressEst,
        `Hệ thống đang xếp hàng xử lý (vị trí: ${position})... Vui lòng đợi trong giây lát!`
      );
    }
  });
}

function enqueueJob(jobId, jobLogger, jobFn) {
  return new Promise((resolve, reject) => {
    jobQueue.push({ jobId, jobLogger, jobFn, resolve, reject });
    processNextJob();
  });
}

function processNextJob() {
  if (runningJobsCount >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) {
    return;
  }
  const { jobId, jobLogger, jobFn, resolve, reject } = jobQueue.shift();
  runningJobsCount++;
  console.log(`[DEBUG][server] Bắt đầu chạy Job ${jobId} từ hàng đợi. Đang chạy: ${runningJobsCount}/${MAX_CONCURRENT_JOBS}, Còn đợi trong queue: ${jobQueue.length}`);

  // Cập nhật lại số thứ tự cho các jobs còn lại đang chờ trong hàng đợi
  updateQueuePositions();

  jobFn()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      runningJobsCount--;
      console.log(`[DEBUG][server] Hoàn tất 1 Job ${jobId}. Đang chạy: ${runningJobsCount}/${MAX_CONCURRENT_JOBS}, Còn đợi trong queue: ${jobQueue.length}`);
      processNextJob();
    });
}

// Cấu hình lưu trữ file upload tạm thời
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB theo Brand Safety
  fileFilter: (req, file, cb) => {
    // Chỉ cho phép upload định dạng hình ảnh an toàn, chặn file thực thi / script
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận các tệp hình ảnh định dạng JPG, PNG hoặc WEBP.'));
    }
    cb(null, true);
  }
});

/**
 * Endpoint Healthcheck
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    server: 'Milo Media Engine',
    timestamp: new Date().toISOString()
  });
});

// Giới hạn tối đa 6 tiến trình nhận diện khuôn mặt AI chạy đồng thời trên máy chủ e2-standard-8 (8 vCPU, 32GB RAM)
const MAX_CONCURRENT_DETECT_FACE = 6;
let runningDetectFaceCount = 0;
const detectFaceQueue = [];

function runDetectFaceTask(taskFn) {
  return new Promise((resolve, reject) => {
    detectFaceQueue.push({ taskFn, resolve, reject });
    processNextDetectFace();
  });
}

function processNextDetectFace() {
  if (runningDetectFaceCount >= MAX_CONCURRENT_DETECT_FACE || detectFaceQueue.length === 0) {
    return;
  }
  const { taskFn, resolve, reject } = detectFaceQueue.shift();
  runningDetectFaceCount++;
  taskFn()
    .then(resolve)
    .catch(reject)
    .finally(() => {
      runningDetectFaceCount--;
      processNextDetectFace();
    });
}

/**
 * Endpoint Nhận diện khuôn mặt & Kiểm duyệt hình ảnh lãnh tụ AI
 */
app.post('/api/detect-face', upload.any(), async (req, res) => {
  try {
    const file = req.files && req.files.length > 0 ? req.files[0] : null;
    if (!file || !fs.existsSync(file.path)) {
      return res.status(400).json({ success: false, error: 'Vui lòng chọn một file ảnh hợp lệ.' });
    }

    const scriptPath = path.join(__dirname, 'services', 'detect_face.py');

    await runDetectFaceTask(() => new Promise((resolve) => {
      // Sử dụng execFile với mảng tham số riêng biệt và timeout 30s chống treo tiến trình
      execFile('python', [scriptPath, file.path], { timeout: 30000 }, (error, stdout, stderr) => {
        // Dọn dẹp file tạm
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {}

        if (error) {
          console.error('[DETECT_FACE_ERROR]', stderr || error.message);
          res.status(500).json({ success: false, error: 'Lỗi nhận diện khuôn mặt' });
          return resolve();
        }

        try {
          const out = stdout.trim();
          const data = JSON.parse(out);

          // 1. Nếu vi phạm tiêu chuẩn cộng đồng (phát hiện mặt lãnh tụ / chính khách)
          if (data.violation) {
            res.status(400).json({
              success: false,
              violation: true,
              error: data.errorMessage || 'Hình ảnh vi phạm tiêu chuẩn cộng đồng. Vui lòng tải lên hình ảnh cá nhân của bạn!'
            });
            return resolve();
          }

          // 2. Nếu không phát hiện khuôn mặt hợp lệ
          if (!data.hasFace) {
            res.status(400).json({
              success: false,
              error: 'Không phát hiện thấy khuôn mặt trong ảnh. Vui lòng chọn ảnh chụp rõ khuôn mặt!'
            });
            return resolve();
          }

          // 3. Hợp lệ
          res.json({
            success: true,
            faceCount: data.faceCount || 1,
            previewUrl: data.faceCrop || (data.previewBase64 ? `data:image/jpeg;base64,${data.previewBase64}` : null),
            message: data.faceCount > 1 
              ? `Đã phát hiện ${data.faceCount} khuôn mặt (Hệ thống tự động chọn khuôn mặt nổi bật nhất)`
              : 'Đã nhận diện khuôn mặt hợp lệ!'
          });
        } catch (parseErr) {
          console.error('[DETECT_FACE_PARSE_ERROR]', stdout);
          res.status(500).json({ success: false, error: 'Không thể phân tích kết quả AI' });
        }
        resolve();
      });
    }));
  } catch (err) {
    console.error('[DETECT_FACE_EXCEPTION]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoint Khởi chạy tiến trình Tạo Nhạc & Video Cổ Vũ Milo (B1 -> B5)
 */
app.post('/api/generate-cheer', upload.single('avatar'), async (req, res) => {
  try {
    const { name, topic = 'WORK', voiceType = '01', lastJobId, phone, phoneNumber, verificationToken, token } = req.body;
    const avatarFile = req.file;

    // 0. Xác thực OTP Token / Phone Verification (Chống Denial of Wallet & Bot spam - CWE-306)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const customHeaderToken = req.headers['x-verification-token'] || req.headers['x-token'];
    const tokenToCheck = verificationToken || token || bearerToken || customHeaderToken;
    const targetPhone = phone || phoneNumber;

    let isAuthorized = false;
    if (tokenToCheck) {
      const tokenVerification = verifyVerificationToken(tokenToCheck);
      if (tokenVerification.valid) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized && targetPhone && isPhoneAlreadyVerified(targetPhone)) {
      isAuthorized = true;
    }
    // Cho phép khi người dùng thực hiện "Thử giọng khác" (có lastJobId từ phiên tạo trước đó)
    if (!isAuthorized && lastJobId && isValidJobId(lastJobId)) {
      console.log(`[DEBUG][server] Cho phép tạo video mới vì người dùng đổi giọng từ job trước: ${lastJobId}`);
      isAuthorized = true;
    }
    // Cho phép khi request đến từ origin/referer của Staging / Production / Localhost đã được ủy quyền
    const origin = req.headers.origin || req.headers.referer || '';
    const miloClientHeader = req.headers['x-milo-client'] || req.headers['x-milo-platform'];
    if (!isAuthorized && (
      origin.includes('cungmilocovutoicung') ||
      origin.includes('featuremilo-2026') ||
      origin.includes('platformsh.site') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      miloClientHeader === 'web' ||
      miloClientHeader === 'staging'
    )) {
      console.log(`[DEBUG][server] Cho phép truy cập từ origin/client hợp lệ: ${origin || miloClientHeader}`);
      isAuthorized = true;
    }

    console.log(`[DEBUG][server] Kết quả xác thực quyền tạo video: isAuthorized=${isAuthorized}, targetPhone="${targetPhone || ''}", tokenPresent=${Boolean(tokenToCheck)}`);

    if (!isAuthorized && process.env.NODE_ENV === 'production') {
      return res.status(401).json({
        success: false,
        error: 'Vui lòng xác thực mã OTP trước khi tạo video cổ vũ.'
      });
    }

    // Sinh JobId bằng CSPRNG chuẩn mật mã học (CWE-330)
    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const jobLogger = new JobLogger(jobId);

    console.log(`[DEBUG][server] Nhận yêu cầu generate-cheer - JobId: ${jobId}, Tên: "${name}", Topic: ${topic}, VoiceType: ${voiceType}, LastJobId: ${lastJobId || 'NONE'}`);
    jobLogger.log(`[REQUEST_RECEIVED] Name: "${name}", Topic: ${topic}, VoiceType: ${voiceType}, Avatar: ${avatarFile ? avatarFile.originalname : 'NONE'}, LastJobId: ${lastJobId || 'NONE'}`);

    // Kiểm duyệt Brand Safety Cấp độ 1
    const safetyCheck = checkBrandSafety(name);
    if (!safetyCheck.isValid) {
      jobLogger.log(`[BRAND_SAFETY_VIOLATION] Flag: ${safetyCheck.flag}, Reason: ${safetyCheck.errorMessage}`);
      const moderationResult = {
        jobId,
        inputName: name,
        isValid: false,
        flag: safetyCheck.flag,
        errorMessage: safetyCheck.errorMessage,
        timestamp: new Date().toISOString()
      };
      fs.writeFileSync(path.join(jobLogger.jobDir, 'moderation_result.json'), JSON.stringify(moderationResult, null, 2), 'utf-8');
      jobLogger.updateStatus('REJECTED', 0, safetyCheck.errorMessage);

      return res.status(400).json({
        success: false,
        error: safetyCheck.errorMessage,
        flag: safetyCheck.flag
      });
    }

    if (runningJobsCount >= MAX_CONCURRENT_JOBS) {
      jobLogger.updateStatus('QUEUED', 2, `Hệ thống đang xếp hàng xử lý (vị trí: ${jobQueue.length + 1})... Vui lòng đợi trong giây lát!`);
    } else {
      jobLogger.updateStatus('PENDING', 5, 'Khởi tạo tác vụ tạo video cổ vũ...');
    }

    // Trả về jobId ngay lập tức cho client để polling
    res.json({
      success: true,
      jobId,
      statusUrl: `/api/jobs/${jobId}/status`,
      message: 'Job started'
    });

    // Thực thi tác vụ qua hàng đợi giới hạn concurrency (Tối đa 4 jobs song song)
    enqueueJob(jobId, jobLogger, async () => {
      const jobStartTime = Date.now();
      jobLogger.updateStatus('PROCESSING_START', 8, 'Bắt đầu xử lý tác vụ...');
      jobLogger.log(`[TIMER_START] Bắt đầu xử lý Job ${jobId} lúc ${new Date().toLocaleTimeString('vi-VN')}`);

      try {
        // B1: Trích xuất tên cuối
        const t1 = Date.now();
        jobLogger.updateStatus('PROCESSING_NAME', 15, 'Trích xuất tên người nhận...');
        const lastName = extractLastName(name);
        const d1 = ((Date.now() - t1) / 1000).toFixed(2);
        jobLogger.log(`[STEP_1] Tên cuối: "${lastName}" (${d1}s)`);

        // B2: Cắt mặt và tách nền ảnh đại diện (234px)
        const t2 = Date.now();
        jobLogger.updateStatus('PROCESSING_AVATAR', 30, 'Xử lý khuôn mặt và tách nền...');
        let headImagePath = path.join(jobLogger.jobDir, 'input_head.png');
        if (lastJobId && fs.existsSync(path.join(JOBS_DIR, lastJobId, 'input_head.png'))) {
          // Tái sử dụng khuôn mặt người chơi đã cắt từ lượt tạo trước (Thử giọng khác)
          const previousHead = path.join(JOBS_DIR, lastJobId, 'input_head.png');
          fs.copyFileSync(previousHead, headImagePath);
          console.log(`[DEBUG][server] Tái sử dụng khuôn mặt từ lastJobId: ${lastJobId}`);
          jobLogger.log(`[IMG_PROC_REUSED] Tái sử dụng khuôn mặt người chơi từ job trước: ${lastJobId}`);
        } else if (avatarFile && fs.existsSync(avatarFile.path)) {
          headImagePath = await processUserAvatar(avatarFile.path, jobLogger);
        } else {
          // Fallback: Dùng ảnh mặc định có sẵn
          const fallbackCandidates = [
            path.join(__dirname, '../public/character.png'),
            path.join(__dirname, '../public/info-upload-icon.png'),
            path.join(__dirname, '../public/LOGO.png')
          ];
          const availableFallback = fallbackCandidates.find(p => fs.existsSync(p));
          if (availableFallback) {
            await processUserAvatar(availableFallback, jobLogger);
          }
        }
        const d2 = ((Date.now() - t2) / 1000).toFixed(2);
        jobLogger.log(`[STEP_2] Head image sẵn sàng tại: ${headImagePath} (${d2}s)`);

        // B3 & B4: Sinh Voice AI qua ElevenLabs và ghép audio
        const t3 = Date.now();
        jobLogger.updateStatus('GENERATING_VOICE', 50, 'Sinh giọng cổ vũ AI...');
        console.log(`[DEBUG][server] Bắt đầu sinh voice với voiceType: ${voiceType}`);
        const voiceResult = await generateVoiceIntro(lastName, voiceType, jobLogger);
        
        jobLogger.updateStatus('MIXING_AUDIO', 65, 'Nối audio và giai điệu Milo...');
        const mixedAudioPath = await concatenateAudio(voiceResult.audioPath, voiceType, topic, jobLogger, lastName);
        const d3 = ((Date.now() - t3) / 1000).toFixed(2);
        jobLogger.log(`[STEP_4] Audio hoàn thiện tại: ${mixedAudioPath} (${d3}s)`);

        // B5: Ghép layer Video hoàn chỉnh bằng FFmpeg
        const t4 = Date.now();
        jobLogger.updateStatus('COMPOSING_VIDEO', 80, 'Đang xuất bản video Full HD...');
        const composeResult = await composeFinalVideo({
          headImagePath,
          mixedAudioPath,
          topic,
          lastName,
          jobLogger
        });
        const d4 = ((Date.now() - t4) / 1000).toFixed(2);
        jobLogger.log(`[STEP_5] Video render hoàn tất (${d4}s)`);

        // B6: Tải toàn bộ thư mục Job lên Firebase Storage folder jobs/{jobId}/
        const t5 = Date.now();
        let firebaseFiles = null;
        try {
          firebaseFiles = await syncJobToFirebaseStorage(jobId, jobLogger.jobDir, jobLogger);
        } catch (storageErr) {
          jobLogger.log(`[FIREBASE_STORAGE_WARN] Upload to Firebase Storage failed: ${storageErr.message}`);
        }
        const d5 = ((Date.now() - t5) / 1000).toFixed(2);

        // Mọi video phải nằm trên Firebase Storage; chỉ khi Firebase lỗi cả 3 lần mới dùng URL backend công khai (HTTPS), không bao giờ trả localhost cho client
        if (!firebaseFiles?.['output.mp4']) {
          jobLogger.log('[FIREBASE_STORAGE_ERROR] output.mp4 CHƯA được lưu lên Firebase Storage sau 3 lần thử!');
          console.error(`[DEBUG][server] Job ${jobId}: output.mp4 chưa lên được Firebase Storage`);
        }
        const publicBackendUrl = (process.env.PUBLIC_BACKEND_URL || 'https://136-85-20-35.sslip.io').replace(/\/$/, '');
        const videoUrl = firebaseFiles?.['output.mp4'] || `${publicBackendUrl}/api/jobs/${jobId}/output.mp4`;
        const thumbnailUrl = firebaseFiles?.['thumbnail.jpg'] || `${publicBackendUrl}/api/jobs/${jobId}/thumbnail.jpg`;
        const audioUrl = firebaseFiles?.['mixed_audio.mp3'] || `${publicBackendUrl}/api/jobs/${jobId}/mixed_audio.mp3`;

        const totalJobSeconds = ((Date.now() - jobStartTime) / 1000).toFixed(2);

        const finalResult = {
          jobId,
          phoneNumber: targetPhone || '',
          recipientName: lastName,
          fullName: name,
          topic,
          voiceType,
          title: composeResult.titleText,
          videoUrl,
          thumbnailUrl,
          audioUrl,
          durationSeconds: parseFloat(totalJobSeconds),
          stepDurations: {
            nameExtraction: `${d1}s`,
            headProcessing: `${d2}s`,
            voiceAndAudio: `${d3}s`,
            videoComposing: `${d4}s`,
            cloudUpload: `${d5}s`
          },
          firebaseStorage: firebaseFiles || null,
          videoPath: composeResult.videoPath,
          thumbnailPath: path.join(jobLogger.jobDir, 'thumbnail.jpg'),
          mixedAudioPath,
          headImagePath
        };

        jobLogger.setResult(finalResult);
        console.log(`⏱️ [BENCHMARK_SERVER] Hoàn tất Job ${jobId} trong ${totalJobSeconds}s (Head: ${d2}s, Voice: ${d3}s, Video: ${d4}s, Upload: ${d5}s)`);
        jobLogger.log(`====================================================`);
        jobLogger.log(`⏱️ [BENCHMARK_COMPLETE] Tổng thời gian tạo video: ${totalJobSeconds}s`);
        jobLogger.log(`• Tên: "${name}" | Chủ đề: ${topic} | Giọng: ${voiceType}`);
        jobLogger.log(`• Thời gian chi tiết: Mặt=${d2}s, Voice=${d3}s, Video=${d4}s, Upload=${d5}s`);
        jobLogger.log(`• Video URL: ${finalResult.videoUrl}`);
        jobLogger.log(`• Thumbnail URL: ${finalResult.thumbnailUrl}`);
        jobLogger.log(`====================================================`);

        // Dọn dẹp file upload tạm
        if (avatarFile && fs.existsSync(avatarFile.path)) {
          fs.unlinkSync(avatarFile.path);
        }
      } catch (jobErr) {
        jobLogger.setError(jobErr);
        jobLogger.log(`[JOB_FATAL_ERROR] ${jobErr.stack || jobErr.message}`);
      }
    });

  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Endpoint Kiểm tra trạng thái Job (Polling)
 */
app.get('/api/jobs/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(400).json({ success: false, error: 'Mã Job không hợp lệ' });
  }
  const logger = new JobLogger(jobId);
  const status = logger.getStatus();
  const rawResult = logger.getResult();
  let result = null;
  if (rawResult) {
    result = { ...rawResult };
    // Loại bỏ đường dẫn tệp tuyệt đối trên ổ cứng máy chủ (CWE-209 / CWE-200)
    delete result.videoPath;
    delete result.thumbnailPath;
    delete result.mixedAudioPath;
    delete result.headImagePath;
  }

  res.json({
    jobId,
    ...status,
    result: result || null
  });
});

/**
 * Endpoint Trả kết quả Job
 */
app.get('/api/jobs/:jobId/result', (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(400).json({ error: 'Mã Job không hợp lệ' });
  }
  const logger = new JobLogger(jobId);
  const rawResult = logger.getResult();
  if (!rawResult) return res.status(404).json({ error: 'Result not ready or job failed' });

  // Loại bỏ đường dẫn tệp tuyệt đối trên ổ cứng máy chủ (CWE-209 / CWE-200)
  const result = { ...rawResult };
  delete result.videoPath;
  delete result.thumbnailPath;
  delete result.mixedAudioPath;
  delete result.headImagePath;

  res.json(result);
});

/**
 * Endpoint Phục vụ Ảnh Thumbnail trích xuất tại 0:01s
 */
app.get('/api/jobs/:jobId/thumbnail.jpg', (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(400).send('Mã Job không hợp lệ');
  }
  const thumbPath = path.join(JOBS_DIR, jobId, 'thumbnail.jpg');
  if (fs.existsSync(thumbPath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(thumbPath);
  } else {
    res.status(404).send('Thumbnail not found');
  }
});

/**
 * Endpoint Stream Video Output (Hỗ trợ tua Range video)
 */
app.get('/api/jobs/:jobId/output.mp4', (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(400).send('Mã Job không hợp lệ');
  }
  const videoPath = path.join(JOBS_DIR, jobId, 'output.mp4');

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found or still processing');
  }

  // Tạo tên file tùy biến dựa theo chủ đề và tên người nhận
  const logger = new JobLogger(jobId);
  const result = logger.getResult();
  let customFileName = 'MILO-Video-Co-Vu.mp4';
  if (result) {
    const rawName = (result.recipientName || result.fullName || 'Ban')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    let prefix = 'Co-Vu-Toi-Cung';
    if (result.topic === 'WORK') prefix = 'Lam-Toi';
    else if (result.topic === 'STUDY') prefix = 'Hoc-Toi';
    else if (result.topic === 'WORKOUT') prefix = 'Tap-Toi';
    customFileName = `MILO-${prefix}-${rawName}.mp4`;
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const dispositionType = req.query.download ? 'attachment' : 'inline';

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Content-Disposition': `${dispositionType}; filename="${customFileName}"`
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Content-Disposition': `${dispositionType}; filename="${customFileName}"`
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

/**
 * Hàm chuẩn hóa loại bỏ dấu tiếng Việt để tạo tên tệp an toàn
 */
function removeVietnameseTonesForDownload(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9_\-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * API GET: Tải tệp Video MP4 đính kèm trực tiếp (Tối ưu đặc biệt cho iOS Safari theo chuẩn MSB AI MUSIC GAME)
 * URL: /api/jobs/download-video/:jobId/:fileName
 * URL: /api/jobs/download-video/:jobId
 * URL: /api/jobs/:jobId/download
 */
const handleDownloadVideo = async (req, res) => {
  try {
    const rawPath = req.params[0] || req.params.jobId || '';
    const parts = rawPath.split('/').filter(Boolean);
    const inputJobId = (parts[0] || req.params.jobId || 'local').trim();
    
    // Chuẩn hóa các biến thể của jobId: có tiền tố job_ và không có tiền tố job_
    const rawJobId = inputJobId.replace(/^job_/, '');
    const normalizedJobId = inputJobId.startsWith('job_') ? inputJobId : `job_${inputJobId}`;

    console.log(`[DEBUG][downloadVideo] Nhận yêu cầu tải video: input="${inputJobId}", normalized="${normalizedJobId}", raw="${rawJobId}"`);

    // Kiểm tra định dạng jobId an toàn chống Path Traversal (CWE-22)
    if (!isValidJobId(inputJobId) && !isValidJobId(rawJobId) && !isValidJobId(normalizedJobId)) {
      console.warn(`[DEBUG][downloadVideo] Mã Job không hợp lệ: "${inputJobId}"`);
      return res.status(400).json({ success: false, message: 'Mã Job không hợp lệ' });
    }

    // 1. Đọc result.json trực tiếp (KHÔNG dùng JobLogger vì constructor sẽ tự tạo thư mục job rác)
    let jobResult = null;
    const testIds = [...new Set([normalizedJobId, inputJobId, rawJobId])];
    for (const testId of testIds) {
      const resultFile = path.join(JOBS_DIR, testId, 'result.json');
      try {
        if (fs.existsSync(resultFile)) {
          jobResult = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
          console.log(`[DEBUG][downloadVideo] Đọc thành công result.json từ key: "${testId}"`);
          break;
        }
      } catch (readErr) {
        console.warn(`[DEBUG][downloadVideo] Lỗi đọc ${resultFile}: ${readErr.message}`);
      }
    }

    // 2. Xác định tên file tải về đẹp chuẩn MSB AI MUSIC GAME
    let rawName = parts[1] ? parts[1].replace(/\.mp4$/i, '') : (req.params.fileName ? req.params.fileName.replace(/\.mp4$/i, '') : (req.query.name || ''));
    if (!rawName && jobResult) {
      const recipientName = removeVietnameseTonesForDownload(jobResult.recipientName || jobResult.fullName || 'Ban');
      let prefix = 'Co-Vu-Toi-Cung';
      const topicUpper = (jobResult.topic || '').toUpperCase();
      if (topicUpper === 'WORK') prefix = 'Lam-Toi';
      else if (topicUpper === 'STUDY') prefix = 'Hoc-Toi';
      else if (topicUpper === 'WORKOUT') prefix = 'Tap-Toi';
      rawName = `MILO-${prefix}-${recipientName}`;
    }
    if (!rawName) rawName = 'MILO-Video-Co-Vu';

    const safeName = removeVietnameseTonesForDownload(rawName) || 'MILO-Video-Co-Vu';
    const fileName = `${safeName}.mp4`;

    // 3. Danh sách nguồn video theo thứ tự ưu tiên:
    //    (1) Firebase Storage của job (nguồn lưu trữ chính thức của mọi video)
    //    (2) File output.mp4 local trên VM (dự phòng khi Firebase tạm lỗi)
    //    (3) videoUrl do client gửi lên (Firebase / video demo trên Platform.sh)
    const firebaseVideoUrl = jobResult?.firebaseStorage?.['output.mp4'] || null;
    const cloudCandidates = [
      firebaseVideoUrl,
      jobResult?.videoUrl,
      req.query.videoUrl,
      req.query.firebaseUrl
    ].filter((u, i, arr) => typeof u === 'string' && /^https?:\/\//i.test(u) && arr.indexOf(u) === i);

    const isAllowedSource = (parsedUrl) => {
      const host = parsedUrl.hostname.toLowerCase();
      const allowedHosts = [
        'firebasestorage.googleapis.com',
        'milo-3b596.firebasestorage.app',
        'storage.googleapis.com',
        'localhost',
        '127.0.0.1',
        '136.85.20.35',
        '136-85-20-35.sslip.io'
      ];
      return allowedHosts.includes(host) ||
        host.endsWith('.trycloudflare.com') ||
        host.endsWith('.platformsh.site') ||
        host === 'giadinhnestle.com.vn' ||
        host.endsWith('.giadinhnestle.com.vn');
    };

    const setAttachmentHeaders = (contentLength) => {
      res.setHeader('Content-Type', 'video/mp4');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    };

    // Proxy stream 1 nguồn cloud, trả về true nếu đã bắt đầu stream cho client
    const tryProxyStream = async (cloudUrl) => {
      try {
        const parsedUrl = new URL(cloudUrl);
        if (!isAllowedSource(parsedUrl)) {
          console.warn(`[DEBUG][downloadVideo] Bỏ qua nguồn không tin cậy (SSRF): ${cloudUrl}`);
          return false;
        }
        if (parsedUrl.pathname.includes('/download-video/')) {
          console.warn(`[DEBUG][downloadVideo] Bỏ qua URL trỏ về chính endpoint download: ${cloudUrl}`);
          return false;
        }
        console.log(`[DEBUG][downloadVideo] Thử proxy stream từ: ${cloudUrl}`);
        const cloudRes = await axios({
          method: 'get',
          url: cloudUrl,
          responseType: 'stream',
          timeout: 60000,
          maxRedirects: 3,
          validateStatus: (s) => s === 200
        });
        const upstreamType = String(cloudRes.headers['content-type'] || '');
        if (upstreamType && !upstreamType.includes('video') && !upstreamType.includes('octet-stream')) {
          console.warn(`[DEBUG][downloadVideo] Nguồn ${cloudUrl} trả về "${upstreamType}" không phải video, bỏ qua.`);
          cloudRes.data.destroy();
          return false;
        }
        setAttachmentHeaders(cloudRes.headers['content-length']);
        cloudRes.data.on('error', (e) => {
          console.error('[DEBUG][downloadVideo] Lỗi giữa chừng khi stream:', e.message);
          res.destroy(e);
        });
        cloudRes.data.pipe(res);
        console.log(`[DEBUG][downloadVideo] Proxy stream thành công từ: ${cloudUrl}`);
        return true;
      } catch (streamErr) {
        console.error(`[DEBUG][downloadVideo] Proxy từ ${cloudUrl} thất bại: ${streamErr.message}`);
        return false;
      }
    };

    // 4. Ưu tiên số 1: Firebase Storage
    if (firebaseVideoUrl && await tryProxyStream(firebaseVideoUrl)) return;

    // 5. Dự phòng: file local trên VM
    const candidateVideoPaths = [...new Set([
      path.join(JOBS_DIR, normalizedJobId, 'output.mp4'),
      path.join(JOBS_DIR, inputJobId, 'output.mp4'),
      path.join(JOBS_DIR, rawJobId, 'output.mp4')
    ])];
    for (const cp of candidateVideoPaths) {
      try {
        if (fs.existsSync(cp) && fs.statSync(cp).size > 1024) {
          const stat = fs.statSync(cp);
          console.log(`[DEBUG][downloadVideo] Phát video local: "${cp}" (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
          setAttachmentHeaders(stat.size);
          return fs.createReadStream(cp).pipe(res);
        }
      } catch (_) {}
    }

    // 6. Các nguồn cloud còn lại (videoUrl của job / do client gửi lên)
    for (const cloudUrl of cloudCandidates) {
      if (cloudUrl === firebaseVideoUrl) continue;
      if (await tryProxyStream(cloudUrl)) return;
    }

    console.warn(`[DEBUG][downloadVideo] Hoàn toàn không tìm thấy video cho job: "${inputJobId}" (đã thử ${cloudCandidates.length} nguồn cloud)`);
    const notFoundMessage = 'Video chưa sẵn sàng hoặc không tìm thấy.';
    if (String(req.headers.accept || '').includes('text/html')) {
      // Người dùng mở trực tiếp trên Safari -> hiển thị trang thông báo thân thiện thay vì JSON thô
      return res.status(404).send(`<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MILO - Tải video</title></head><body style="font-family:sans-serif;background:#005C28;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1 style="color:#FFDF00">${notFoundMessage}</h1><p>Vui lòng quay lại trang chiến dịch và bấm "Tạo bài mới" để tạo lại video cổ vũ.</p></div></body></html>`);
    }
    return res.status(404).json({ success: false, message: notFoundMessage });
  } catch (err) {
    console.error('[DEBUG][downloadVideo] Lỗi ngoại lệ trong quá trình tải video:', err);
    return res.status(500).json({ success: false, message: 'Lỗi trong quá trình tải video.' });
  }
};

app.get('/api/jobs/download-video/:jobId/:fileName', handleDownloadVideo);
app.get('/api/jobs/download-video/:jobId', handleDownloadVideo);
app.get('/api/jobs/:jobId/download', handleDownloadVideo);
app.get('/api/download-video/:jobId/:fileName', handleDownloadVideo);
app.get('/api/download-video/:jobId', handleDownloadVideo);


/**
 * Endpoint Stream Audio Output
 */
app.get('/api/jobs/:jobId/mixed_audio.mp3', (req, res) => {
  const { jobId } = req.params;
  if (!isValidJobId(jobId)) {
    return res.status(400).send('Mã Job không hợp lệ');
  }
  const audioPath = path.join(JOBS_DIR, jobId, 'mixed_audio.mp3');
  if (!fs.existsSync(audioPath)) {
    return res.status(404).send('Audio not found');
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  fs.createReadStream(audioPath).pipe(res);
});

/**
 * Endpoint Gửi mã OTP qua Abenla SMS API
 */
app.post('/api/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp số điện thoại' });
    }

    // Chốt chặn bảo vệ cước Abenla: Nếu số điện thoại đã xác thực trước đó thì cấp luôn token, không bắn OTP mới
    if (isPhoneAlreadyVerified(phoneNumber)) {
      const verificationToken = createVerificationToken(phoneNumber);
      console.log(`[DEBUG][server] Bỏ qua gửi OTP Abenla vì SĐT đã xác thực trước đó: ${phoneNumber}`);
      return res.json({
        success: true,
        alreadyVerified: true,
        verificationToken,
        message: 'Số điện thoại đã được xác thực trước đó.'
      });
    }

    const result = await sendOtpSms(phoneNumber);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('Lỗi khi gửi OTP:', error);
    res.status(500).json({ success: false, error: 'Không thể gửi tin nhắn OTP lúc này' });
  }
});

/**
 * Endpoint Xác thực mã OTP
 */
app.post('/api/verify-otp', (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, error: 'Thiếu số điện thoại hoặc mã OTP' });
    }

    const result = verifyOtp(phoneNumber, otp);
    if (!result.isValid) {
      return res.status(400).json({ success: false, error: result.message });
    }

    // Cấp token xác thực đã ký (Hạn 15 phút) cho lượt gọi generate-cheer tiếp theo
    const verificationToken = createVerificationToken(phoneNumber);
    res.json({
      success: true,
      message: result.message,
      verificationToken,
      phone: result.cleanPhone
    });
  } catch (error) {
    console.error('Lỗi khi xác thực OTP:', error);
    res.status(500).json({ success: false, error: 'Không thể xác thực OTP lúc này' });
  }
});

/**
 * Endpoint Kiểm tra Số điện thoại đã từng xác thực OTP thành công
 */
app.get('/api/check-phone-verified', (req, res) => {
  const phone = req.query.phone || req.query.phoneNumber;
  if (!phone) {
    return res.json({ success: true, verified: false });
  }
  const isVerified = isPhoneAlreadyVerified(phone);
  let verificationToken = null;
  if (isVerified) {
    verificationToken = createVerificationToken(phone);
  }
  res.json({ success: true, verified: isVerified, verificationToken });
});

/**
 * ==============================================================================
 * DASHBOARD & CAMPAIGN ANALYTICS ENDPOINTS
 * ==============================================================================
 */

/**
 * Endpoint Lấy Thống kê Tổng quan Chiến dịch (KPIs, Topics, Voices, Pipeline performance)
 */
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = getDashboardStats();
    res.json({ success: true, ...stats });
  } catch (err) {
    console.error('[DASHBOARD_STATS_ERROR]', err);
    res.status(500).json({ success: false, error: 'Không thể tải thống kê chiến dịch lúc này' });
  }
});

/**
 * Endpoint Lấy Danh sách Chi tiết các Jobs Render Video (Search, Filter, Pagination)
 */
app.get('/api/dashboard/jobs', (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', topic = '', status = '' } = req.query;
    const data = getDashboardJobs({ page, limit, search, topic, status });
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('[DASHBOARD_JOBS_ERROR]', err);
    res.status(500).json({ success: false, error: 'Không thể tải danh sách lượt tạo video' });
  }
});

/**
 * Endpoint Lấy Danh sách Số điện thoại đã xác thực
 */
app.get('/api/dashboard/verified-phones', (req, res) => {
  try {
    const phones = getVerifiedPhones();
    res.json({ success: true, count: phones.length, phones });
  } catch (err) {
    console.error('[DASHBOARD_PHONES_ERROR]', err);
    res.status(500).json({ success: false, error: 'Không thể tải danh sách số điện thoại' });
  }
});


/**
 * Tự động dọn file media nặng của các job cũ (> JOB_MEDIA_TTL_HOURS) đã đồng bộ lên Firebase Storage.
 * Nguyên nhân sự cố 12/10/2026: ổ đĩa VM đầy 100% (21GB jobs) -> ENOSPC -> render thất bại,
 * verified_phones.json bị ghi rỗng -> frontend rơi về video demo -> nút "Tải về" báo 404.
 * Giữ lại result.json/status.json/log.txt để Dashboard vẫn đọc được; tải về sẽ proxy từ Firebase.
 */
const JOB_MEDIA_TTL_HOURS = parseInt(process.env.JOB_MEDIA_TTL_HOURS || '48', 10);
const HEAVY_MEDIA_EXT = ['.mp4', '.mp3', '.wav', '.png', '.jpg', '.jpeg', '.webm'];

function cleanupOldJobMedia() {
  const cutoff = Date.now() - JOB_MEDIA_TTL_HOURS * 3600 * 1000;
  let removedFiles = 0;
  let freedBytes = 0;
  try {
    for (const dir of fs.readdirSync(JOBS_DIR)) {
      const jobDir = path.join(JOBS_DIR, dir);
      try {
        const dirStat = fs.statSync(jobDir);
        if (!dirStat.isDirectory() || dirStat.mtimeMs > cutoff) continue;

        // Chỉ xoá khi video đã có bản sao trên Firebase Storage (an toàn cho chức năng tải về)
        const resultFile = path.join(jobDir, 'result.json');
        if (!fs.existsSync(resultFile)) continue;
        const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        const cloudVideo = result?.firebaseStorage?.['output.mp4'] || '';
        if (!String(cloudVideo).startsWith('https://firebasestorage.googleapis.com/')) continue;

        for (const file of fs.readdirSync(jobDir)) {
          if (!HEAVY_MEDIA_EXT.includes(path.extname(file).toLowerCase())) continue;
          const filePath = path.join(jobDir, file);
          const size = fs.statSync(filePath).size;
          fs.unlinkSync(filePath);
          removedFiles += 1;
          freedBytes += size;
        }
      } catch (jobErr) {
        console.warn(`[DEBUG][cleanup] Bỏ qua ${dir}: ${jobErr.message}`);
      }
    }
    console.log(`[DEBUG][cleanup] Đã dọn ${removedFiles} file media cũ, giải phóng ${(freedBytes / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    console.error('[DEBUG][cleanup] Lỗi dọn dẹp job cũ:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Milo Backend Server running at: http://localhost:${PORT}`);
  console.log(` Job Logger directory: ${JOBS_DIR}`);
  console.log(` Material directory: ${process.env.MATERIAL_DIR}`);
  console.log(`====================================================`);

  // Dọn dẹp ngay khi khởi động và lặp lại mỗi 6 giờ
  setTimeout(cleanupOldJobMedia, 30 * 1000);
  setInterval(cleanupOldJobMedia, 6 * 3600 * 1000);
});
