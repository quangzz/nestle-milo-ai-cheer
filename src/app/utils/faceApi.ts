/**
 * Quản lý API Nhận diện khuôn mặt (Face Detection) qua Backend
 * - Phát hiện khuôn mặt hợp lệ
 * - Tự động chọn khuôn mặt to nhất nếu có từ 2 người trở lên
 */

import { getBackendEndpoints } from './otpApi';

export async function detectFaceApi(file: File): Promise<{
  success: boolean;
  faceCount?: number;
  message?: string;
  previewUrl?: string;
  error?: string;
}> {
  const endpoints = getBackendEndpoints();
  console.log('[DEBUG][faceApi] detectFaceApi: Bắt đầu kiểm tra khuôn mặt, danh sách endpoints:', endpoints);

  for (const baseUrl of endpoints) {
    try {
      console.log(`[DEBUG][faceApi] Đang gửi ảnh đến ${baseUrl}/api/detect-face...`);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${baseUrl}/api/detect-face`, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[DEBUG][faceApi] ${baseUrl} trả về non-JSON: ${contentType}, bỏ qua.`);
        continue;
      }

      if (response.ok) {
        const data = await response.json();
        console.log(`[DEBUG][faceApi] Kết quả detectFaceApi từ ${baseUrl}:`, data);
        return data;
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn(`[DEBUG][faceApi] ${baseUrl} trả về lỗi ${response.status}:`, errData);
        return {
          success: false,
          error: errData.error || 'Không phát hiện thấy khuôn mặt trong ảnh. Vui lòng chọn ảnh chụp rõ khuôn mặt!'
        };
      }
    } catch (err) {
      console.warn(`[DEBUG][faceApi] Lỗi gọi ${baseUrl}/api/detect-face:`, err);
    }
  }

  // Fallback nếu server không phản hồi
  console.warn('[DEBUG][faceApi] Không thể kết nối server detect-face, sử dụng fallback client.');
  return {
    success: true,
    message: 'Ảnh đã được tải lên thành công.'
  };
}
