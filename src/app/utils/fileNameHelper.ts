/**
 * Tiện ích hỗ trợ đặt tên file động và tải file video trực tiếp về máy
 * Kế thừa cơ chế tải tệp chuẩn của MSB AI MUSIC GAME:
 * - Kích hoạt đồng bộ thẻ <a target="_blank" download> trỏ tới endpoint backend có Content-Disposition: attachment
 * - Safari trên iPhone lập tức hiển thị hộp thoại tải về chuẩn của hệ thống ("Bạn có muốn tải về 'tên_file.mp4' không?")
 *   và lưu thẳng tệp .mp4 vào máy iPhone mà không bị chuyển hướng sang phát link video.
 */

import { getBackendEndpoints } from './otpApi';

/**
 * Chuyển URL tương đối (vd: /demo_office.mp4) thành URL tuyệt đối theo origin hiện tại
 * để backend có thể proxy stream và trả về header attachment.
 */
export function toAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Chọn backend phục vụ endpoint download-video:
 * - Đang chạy local -> backend local
 * - Production (HTTPS) -> endpoint HTTPS đầu tiên (VITE_BACKEND_URL / Cloudflare Tunnel), tránh Mixed Content
 * - Tuyệt đối không lấy origin "http://localhost:5000" từ videoUrl khi đang ở trên điện thoại
 */
function resolveDownloadBackend(): string {
  if (isLocalHost(window.location.hostname)) {
    return 'http://localhost:5005';
  }
  const endpoints = getBackendEndpoints().filter(ep => {
    try {
      const u = new URL(ep);
      return u.protocol === 'https:' && !isLocalHost(u.hostname) && u.origin !== window.location.origin;
    } catch {
      return false;
    }
  });
  return endpoints[0] || 'https://136-85-20-35.sslip.io';
}

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/[đĐ]/g, 'd');
  str = str.replace(/[^a-zA-Z0-9\s-_]/g, '');
  str = str.trim().replace(/\s+/g, '-');
  return str;
}

export function generateVideoFileName(topic?: string, recipientName?: string): string {
  const cleanName = removeVietnameseTones(recipientName || 'Ban') || 'Ban';
  
  let topicPrefix = 'Co-Vu-Toi-Cung';
  if (topic === 'WORK') {
    topicPrefix = 'Lam-Toi';
  } else if (topic === 'STUDY') {
    topicPrefix = 'Hoc-Toi';
  } else if (topic === 'WORKOUT') {
    topicPrefix = 'Tap-Toi';
  }

  return `MILO-${topicPrefix}-${cleanName}.mp4`;
}

/**
 * Dựng URL endpoint backend /api/jobs/download-video/:jobId/:fileName
 * Backend ưu tiên bản Firebase Storage theo jobId, sau đó file local, cuối cùng proxy stream từ videoUrl.
 * Endpoint có CORS cho domain frontend nên dùng được cả cho anchor download lẫn fetch() lấy blob.
 */
export function buildVideoDownloadUrl(videoUrl: string, fileName: string, jobId?: string): string {
  const absoluteVideoUrl = toAbsoluteUrl(videoUrl);
  const backendBase = resolveDownloadBackend();
  const cleanJobId = (jobId || 'local').trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'local';
  const query = new URLSearchParams({ videoUrl: absoluteVideoUrl });
  const downloadUrl = `${backendBase}/api/jobs/download-video/${encodeURIComponent(cleanJobId)}/${encodeURIComponent(fileName)}?${query.toString()}`;
  console.log(`[DEBUG][fileNameHelper] backend="${backendBase}", absoluteVideoUrl="${absoluteVideoUrl}"`);
  return downloadUrl;
}

/**
 * Tải file video MP4 về máy bằng anchor trỏ tới endpoint có Content-Disposition: attachment
 * Dùng cho Desktop / Android / webview không hỗ trợ Web Share API
 */
export function downloadVideoWithCustomName(
  videoUrl: string,
  fileName: string,
  jobId?: string,
  onProgress?: (loading: boolean) => void,
  onToastText?: (text: string | null) => void
): boolean {
  if (!videoUrl) {
    console.warn('[DEBUG][fileNameHelper] Không có videoUrl để tải.');
    return false;
  }

  console.log(`[DEBUG][fileNameHelper] Bắt đầu tải video qua anchor: jobId="${jobId}", fileName="${fileName}", videoUrl="${videoUrl}"`);

  onProgress?.(true);
  if (onToastText) {
    onToastText('Đang tự động tải tệp Video MP4 về máy...');
    setTimeout(() => onToastText(null), 3500);
  }

  // 1. Chuẩn hoá nguồn video + chọn backend HTTPS hợp lệ
  const downloadUrl = buildVideoDownloadUrl(videoUrl, fileName, jobId);
  console.log(`[DEBUG][fileNameHelper] Kích hoạt anchor downloadUrl: ${downloadUrl}`);

  // 2. Kích hoạt đồng bộ ngay lập tức trong sự kiện Tap của người dùng (tránh bị iOS Safari block popup)
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
    onProgress?.(false);
  }, 1200);

  return true;
}
