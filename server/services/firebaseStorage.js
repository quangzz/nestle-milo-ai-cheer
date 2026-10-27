const axios = require('axios');
const path = require('path');
const fs = require('fs');

const BUCKET_NAME = process.env.FIREBASE_STORAGE_BUCKET || 'milo-3b596.firebasestorage.app';

/**
 * Tải một tệp tin lên Firebase Storage tại đường dẫn jobs/{jobId}/{fileName}
 * Sử dụng Firebase Storage REST API tốc độ cao, hoạt động 100% không phụ thuộc JSON key
 */
async function uploadFileToFirebase(localFilePath, remoteDestination, contentType) {
  if (!fs.existsSync(localFilePath)) return null;

  const fileBuffer = fs.readFileSync(localFilePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o?name=${encodeURIComponent(remoteDestination)}&uploadType=media`;
  const MAX_ATTEMPTS = 3;

  // Thử lại tối đa 3 lần để đảm bảo mọi video đều được lưu trên Firebase Storage
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await axios.post(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': contentType || 'application/octet-stream'
        },
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024,
        timeout: 60000
      });

      if (res.status === 200) {
        return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(remoteDestination)}?alt=media`;
      }
      console.warn(`[DEBUG][firebaseStorage] Upload ${remoteDestination} lần ${attempt} trả về status ${res.status}`);
    } catch (error) {
      console.error(`[FIREBASE_UPLOAD_ERROR] Lần ${attempt}/${MAX_ATTEMPTS} upload ${remoteDestination}:`, error.response?.data || error.message);
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  return null;
}

/**
 * Đồng bộ toàn bộ thư mục Job lên Firebase Storage jobs/{jobId}/
 */
async function syncJobToFirebaseStorage(jobId, jobDir, logger) {
  logger?.log(`[FIREBASE_STORAGE] Bắt đầu đồng bộ thư mục job ${jobId} lên Firebase Storage gs://${BUCKET_NAME}/jobs/${jobId}/...`);

  // Chỉ upload các tệp media phục vụ người dùng xem & tải video (Tuyệt đối không upload log nội bộ)
  const filesToUpload = [
    { name: 'output.mp4', type: 'video/mp4' },
    { name: 'thumbnail.jpg', type: 'image/jpeg' },
    { name: 'mixed_audio.mp3', type: 'audio/mpeg' },
    { name: 'input_head.png', type: 'image/png' }
  ];

  const uploadResults = {};

  for (const item of filesToUpload) {
    const localPath = path.join(jobDir, item.name);
    if (fs.existsSync(localPath)) {
      const remotePath = `jobs/${jobId}/${item.name}`;
      const url = await uploadFileToFirebase(localPath, remotePath, item.type);
      if (url) {
        uploadResults[item.name] = url;
        logger?.log(`[FIREBASE_STORAGE_SUCCESS] Đã upload: ${remotePath} -> ${url}`);
      }
    }
  }

  return uploadResults;
}

module.exports = {
  uploadFileToFirebase,
  syncJobToFirebaseStorage,
  BUCKET_NAME
};
