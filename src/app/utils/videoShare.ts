/**
 * Tiện ích lưu video thẳng vào Album ảnh (Photos) trên iPhone/iPad
 * Tham khảo pattern downloadOrShareVideo của TranBaoPlatform:
 *   fetch() -> Blob -> File('video/mp4') -> navigator.share({ files })
 *   -> bảng chia sẻ iOS hiện mục "Lưu video" -> video vào thẳng Album ảnh.
 *
 * Lưu ý:
 * - Firebase Storage không trả header CORS nên phải fetch qua endpoint backend (có CORS).
 * - navigator.share cần "user activation" -> phải gọi ĐỒNG BỘ trong sự kiện chạm,
 *   vì vậy file video được tải trước (prefetch) khi vào màn hình kết quả.
 * - Chỉ share { files } (không kèm text/title) để iOS luôn hiện mục "Lưu video".
 */

import { buildVideoDownloadUrl, toAbsoluteUrl } from './fileNameHelper';

export type ShareVideoResult = 'shared' | 'cancelled' | 'not-allowed' | 'unsupported' | 'failed';

/** Nhận diện iPhone / iPad (kể cả iPadOS 13+ giả lập user agent Mac) */
export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIPadOS;
}

/** Trình duyệt có hỗ trợ chia sẻ file qua Web Share API Level 2 không */
export function isFileShareSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  );
}

/**
 * Chọn URL để fetch blob:
 * - Video cùng origin (vd: /demo_office.mp4) -> fetch trực tiếp
 * - Video Firebase / backend khác origin -> fetch qua endpoint download-video của backend (có CORS)
 */
export function buildVideoFetchUrl(videoUrl: string, fileName: string, jobId?: string): string {
  try {
    const absolute = new URL(toAbsoluteUrl(videoUrl));
    if (absolute.origin === window.location.origin) {
      return absolute.href;
    }
  } catch {
    // Bỏ qua, dùng backend proxy
  }
  return buildVideoDownloadUrl(videoUrl, fileName, jobId);
}

/** Tải video thành File MP4 trong bộ nhớ, báo tiến độ % nếu có Content-Length */
export async function fetchVideoFile(
  url: string,
  fileName: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<File> {
  console.log(`[DEBUG][videoShare] Bắt đầu fetch video: ${url}`);
  const res = await fetch(url, { mode: 'cors', credentials: 'omit', signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType && !contentType.includes('video') && !contentType.includes('octet-stream')) {
    throw new Error(`Nguồn trả về không phải video (content-type=${contentType})`);
  }

  const total = Number(res.headers.get('content-length')) || 0;
  let blob: Blob;

  if (res.body && total > 0 && onProgress) {
    // Đọc từng chunk để hiển thị % tiến độ
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(Math.min(100, Math.round((loaded / total) * 100)));
      }
    }
    blob = new Blob(chunks, { type: 'video/mp4' });
  } else {
    blob = await res.blob();
  }

  if (blob.size === 0) {
    throw new Error('File video rỗng');
  }

  console.log(`[DEBUG][videoShare] Fetch xong video: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
  return new File([blob], fileName, { type: 'video/mp4' });
}

/**
 * Mở bảng chia sẻ hệ thống với file video.
 * QUAN TRỌNG: navigator.share được gọi ngay dòng đầu (trước mọi await) để giữ user activation.
 */
export async function shareVideoFile(file: File): Promise<ShareVideoResult> {
  if (!isFileShareSupported() || !navigator.canShare({ files: [file] })) {
    console.warn('[DEBUG][videoShare] Trình duyệt không hỗ trợ chia sẻ file video');
    return 'unsupported';
  }

  try {
    console.log('[DEBUG][videoShare] Gọi navigator.share với file:', file.name, file.size);
    await navigator.share({ files: [file] });
    console.log('[DEBUG][videoShare] Chia sẻ / lưu video thành công');
    return 'shared';
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    console.warn('[DEBUG][videoShare] navigator.share lỗi:', name, err);
    if (name === 'AbortError') return 'cancelled';
    if (name === 'NotAllowedError') return 'not-allowed';
    return 'failed';
  }
}
