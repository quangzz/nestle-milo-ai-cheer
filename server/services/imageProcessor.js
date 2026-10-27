const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');

const CACHE_DIR = path.join(__dirname, '../cache');
const HEADS_CACHE_DIR = path.join(CACHE_DIR, 'heads');
if (!fs.existsSync(HEADS_CACHE_DIR)) {
  fs.mkdirSync(HEADS_CACHE_DIR, { recursive: true });
}

/**
 * Xử lý cắt đầu, tách nền, trim và resize về chiều cao 234px (Có Content Hash Cache)
 */
function processUserAvatar(inputImagePath, jobLogger) {
  return new Promise((resolve, reject) => {
    const outputHeadPath = path.join(jobLogger.jobDir, 'input_head.png');
    const pythonScript = path.join(__dirname, 'process_head.py');

    // 0. KIỂM TRA IN-CODE CACHE THEO MD5 HASH NỘI DUNG ẢNH (Bỏ qua Rembg AI tốn CPU)
    let cachedHeadPath = null;
    try {
      if (fs.existsSync(inputImagePath)) {
        const fileBuf = fs.readFileSync(inputImagePath);
        const fileHash = crypto.createHash('md5').update(fileBuf).digest('hex');
        cachedHeadPath = path.join(HEADS_CACHE_DIR, `head_${fileHash}_234.png`);

        if (fs.existsSync(cachedHeadPath) && fs.statSync(cachedHeadPath).size > 1000) {
          fs.copyFileSync(cachedHeadPath, outputHeadPath);
          jobLogger.log(`[IMG_PROC_CACHED] Sử dụng Head Avatar từ Disk Cache (${path.basename(cachedHeadPath)})`);
          console.log(`[DEBUG][imageProcessor] HIT CACHE Avatar: ${path.basename(cachedHeadPath)} (0ms, tiết kiệm CPU Rembg)`);
          return resolve(outputHeadPath);
        }
      }
    } catch (cacheErr) {
      console.warn('[imageProcessor] Lỗi kiểm tra cache avatar:', cacheErr.message);
    }

    jobLogger.log(`[IMG_PROC] Starting avatar processing: ${inputImagePath} -> ${outputHeadPath}`);

    const args = [pythonScript, inputImagePath, outputHeadPath, '234'];

    execFile('python', args, (error, stdout, stderr) => {
      if (error) {
        jobLogger.log(`[IMG_PROC_ERROR] Python script error: ${stderr || error.message}`);
        // Fallback: Copy ảnh gốc nếu script lỗi
        try {
          fs.copyFileSync(inputImagePath, outputHeadPath);
          jobLogger.log(`[IMG_PROC_FALLBACK] Copied original image as input_head.png`);
          return resolve(outputHeadPath);
        } catch (e) {
          return reject(error);
        }
      }

      jobLogger.log(`[IMG_PROC_SUCCESS] Head image created: ${outputHeadPath} (234px height)`);

      // Lưu kết quả vào Cache
      if (cachedHeadPath && fs.existsSync(outputHeadPath)) {
        try {
          fs.copyFileSync(outputHeadPath, cachedHeadPath);
          console.log(`[DEBUG][imageProcessor] Đã lưu Head Avatar vào Cache: ${path.basename(cachedHeadPath)}`);
        } catch (_) {}
      }

      resolve(outputHeadPath);
    });
  });
}

module.exports = {
  processUserAvatar
};
