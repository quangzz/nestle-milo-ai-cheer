import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadVideoWithCustomName } from '../utils/fileNameHelper';
import {
  buildVideoFetchUrl,
  fetchVideoFile,
  isFileShareSupported,
  isIOSDevice,
  shareVideoFile,
} from '../utils/videoShare';

interface UseSaveVideoToPhotosParams {
  videoUrl?: string | null;
  jobId?: string;
  fileName: string;
}

const TOAST_HIDE_MS = 3500;

/**
 * Hook lưu video vào Album ảnh iPhone:
 * - iPhone/iPad hỗ trợ Web Share: tải trước video thành File, khi chạm "Tải xuống" mở ngay bảng chia sẻ
 *   -> người dùng chọn "Lưu video" -> video vào thẳng Album ảnh.
 * - Nếu iOS chặn vì video tải chậm (mất user activation) -> hiện nút "Lưu video vào Album ảnh" để chạm lần 2.
 * - Desktop / Android / webview không hỗ trợ -> tải tệp .mp4 qua endpoint attachment như cũ.
 */
export function useSaveVideoToPhotos({ videoUrl, jobId, fileName }: UseSaveVideoToPhotosParams) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [needsSecondTap, setNeedsSecondTap] = useState(false);
  const [toastText, setToastText] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const fileRef = useRef<File | null>(null);
  const pendingRef = useRef<Promise<File> | null>(null);
  const forceAnchorRef = useRef(false);
  const toastTimerRef = useRef<number | null>(null);

  // Chỉ dùng luồng "Lưu vào Album" trên iOS có Web Share API
  const canSaveToPhotos = useMemo(() => isIOSDevice() && isFileShareSupported(), []);

  const showToast = useCallback((text: string | null, autoHide = true) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToastText(text);
    if (text && autoHide) {
      toastTimerRef.current = window.setTimeout(() => setToastText(null), TOAST_HIDE_MS);
    }
  }, []);

  // Tải video thành File (dùng chung cho prefetch và lần chạm đầu tiên)
  const prepareFile = useCallback((): Promise<File> => {
    if (fileRef.current) return Promise.resolve(fileRef.current);
    if (pendingRef.current) return pendingRef.current;
    if (!videoUrl) return Promise.reject(new Error('Không có videoUrl'));

    const url = buildVideoFetchUrl(videoUrl, fileName, jobId);
    const pending = fetchVideoFile(url, fileName, setProgress)
      .then((file) => {
        // Chỉ nhận kết quả nếu vẫn là video hiện tại
        if (pendingRef.current === pending) fileRef.current = file;
        return file;
      })
      .finally(() => {
        if (pendingRef.current === pending) pendingRef.current = null;
      });
    pendingRef.current = pending;
    return pending;
  }, [videoUrl, jobId, fileName]);

  // Prefetch video ngay khi vào màn hình kết quả (chỉ iOS) để lần chạm đầu mở được bảng chia sẻ ngay
  useEffect(() => {
    fileRef.current = null;
    pendingRef.current = null;
    forceAnchorRef.current = false;
    setNeedsSecondTap(false);
    setProgress(null);
    if (!canSaveToPhotos || !videoUrl) return;

    console.log('[DEBUG][useSaveVideoToPhotos] Prefetch video để lưu vào Album ảnh:', { jobId, videoUrl });
    prepareFile().catch((err) => {
      console.warn('[DEBUG][useSaveVideoToPhotos] Prefetch thất bại, sẽ thử lại khi bấm Tải xuống:', err);
    });
  }, [canSaveToPhotos, videoUrl, jobId, prepareFile]);

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  const downloadByAnchor = useCallback(() => {
    if (!videoUrl) return;
    downloadVideoWithCustomName(videoUrl, fileName, jobId, setIsPreparing, (text) => showToast(text));
  }, [videoUrl, fileName, jobId, showToast]);

  // Mở bảng chia sẻ iOS và xử lý kết quả
  const shareFile = useCallback(async (file: File) => {
    const result = await shareVideoFile(file);
    console.log('[DEBUG][useSaveVideoToPhotos] Kết quả share:', result);
    if (result === 'shared') {
      setNeedsSecondTap(false);
      showToast('Đã lưu video! Mở Album ảnh để xem nhé');
    } else if (result === 'cancelled') {
      setNeedsSecondTap(false);
      showToast(null);
    } else if (result === 'not-allowed') {
      // iOS mất user activation do chờ tải video -> cần người dùng chạm thêm 1 lần
      setNeedsSecondTap(true);
      showToast(null);
    } else {
      setNeedsSecondTap(false);
      forceAnchorRef.current = true;
      showToast('Thiết bị chưa hỗ trợ lưu vào Album. Chạm Tải xuống lần nữa để tải tệp video.', false);
    }
  }, [showToast]);

  const handleSave = useCallback(async () => {
    if (!videoUrl || isPreparing) return;

    if (!canSaveToPhotos || forceAnchorRef.current) {
      console.log('[DEBUG][useSaveVideoToPhotos] Dùng luồng tải tệp attachment (không phải iOS Web Share)');
      forceAnchorRef.current = false;
      downloadByAnchor();
      return;
    }

    // Video đã sẵn sàng -> gọi share đồng bộ ngay trong sự kiện chạm
    if (fileRef.current) {
      showToast('Chọn "Lưu video" để lưu vào Album ảnh', false);
      await shareFile(fileRef.current);
      return;
    }

    // Video chưa tải xong -> chờ tải rồi thử mở bảng chia sẻ
    setIsPreparing(true);
    showToast('Đang chuẩn bị video để lưu vào Album ảnh...', false);
    try {
      const file = await prepareFile();
      setIsPreparing(false);
      showToast('Chọn "Lưu video" để lưu vào Album ảnh', false);
      await shareFile(file);
    } catch (err) {
      console.error('[DEBUG][useSaveVideoToPhotos] Không tải được video:', err);
      setIsPreparing(false);
      forceAnchorRef.current = true;
      showToast('Chưa chuẩn bị được video. Chạm Tải xuống lần nữa để tải tệp video.', false);
    }
  }, [videoUrl, isPreparing, canSaveToPhotos, downloadByAnchor, prepareFile, shareFile, showToast]);

  const dismissSecondTap = useCallback(() => setNeedsSecondTap(false), []);

  return {
    handleSave,
    isPreparing,
    needsSecondTap,
    dismissSecondTap,
    toastText,
    progress,
    canSaveToPhotos,
  };
}
