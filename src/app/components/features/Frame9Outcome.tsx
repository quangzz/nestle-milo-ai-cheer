import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { Play, Pause, Loader2 } from 'lucide-react';
import { generateVideoFileName } from '../../utils/fileNameHelper';
import { useSaveVideoToPhotos } from '../../hooks/useSaveVideoToPhotos';
import { SaveToPhotosPrompt } from './SaveToPhotosPrompt';

export const Frame9Outcome: React.FC = () => {
  const { songResult, formData, updateFormData, setStep, generateSongResult } = useCheerCampaign();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(25);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isDesktop = useIsDesktop();

  // Hàm chuyển đổi sang giọng tiếp theo trong danh sách 4 giọng (01 -> 02 -> 03 -> 04 -> 01)
  const handleTryOtherVoice = () => {
    const currentVoice = songResult?.voiceType || formData.voiceType || '01';
    let nextVoice: '01' | '02' | '03' | '04' = '02';
    if (currentVoice === '01') nextVoice = '02';
    else if (currentVoice === '02') nextVoice = '03';
    else if (currentVoice === '03') nextVoice = '04';
    else if (currentVoice === '04') nextVoice = '01';

    console.log(`[DEBUG][Frame9Outcome] Bấm Thử giọng khác: Chuyển từ giọng ${currentVoice} sang giọng ${nextVoice}`);
    try {
      sessionStorage.setItem('milo_target_voice', nextVoice);
    } catch {}
    updateFormData({ voiceType: nextVoice });
    setStep('FRAME_8_LOADING');
  };

  // Hàm tạo bài mới: Chuyển về màn hình tải ảnh lên (FRAME_6_INFO), xóa ảnh cũ để sẵn sàng tải/chụp ảnh mới
  const handleCreateNew = () => {
    console.log('[DEBUG][Frame9Outcome] Bấm Tạo bài mới: Chuyển về trang tải ảnh lên (FRAME_6_INFO)');
    updateFormData({ avatarUrl: null });
    setStep('FRAME_6_INFO');
  };

  // Xử lý Tải xuống: iPhone -> mở bảng chia sẻ để "Lưu video" vào Album ảnh; thiết bị khác -> tải tệp .mp4
  const handleDownload = () => {
    console.log('[DEBUG][Frame9Outcome] Bấm Tải xuống:', { jobId: songResult?.id, canSaveToPhotos });
    void handleSave();
  };

  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.5 },
      colors: ['#005C28', '#28A745', '#FFDF00', '#FFFFFF']
    });

    // Nếu vào thẳng step9 mà chưa có songResult, tự động tạo kết quả
    if (!songResult) {
      console.log('[DEBUG][Frame9Outcome] Tự động khởi tạo songResult fallback');
      generateSongResult();
    }
  }, []);

  const recipientName = formData.recipientName || songResult?.recipientName || 'PHÁT';
  const topic = formData.topic || songResult?.topic || 'WORK';
  const videoFileName = generateVideoFileName(topic, recipientName);

  // Lưu video vào Album ảnh iPhone (Web Share API) / tải tệp trên thiết bị khác
  const {
    handleSave,
    isPreparing: isDownloading,
    needsSecondTap,
    dismissSecondTap,
    toastText: downloadToastText,
    progress: downloadProgress,
    canSaveToPhotos,
  } = useSaveVideoToPhotos({
    videoUrl: songResult?.videoUrl,
    jobId: songResult?.id,
    fileName: videoFileName,
  });

  // Topic-specific cover box / poster fallback
  let defaultCoverImg = '/cover-office.png';
  if (topic === 'STUDY') {
    defaultCoverImg = '/cover-study.png';
  } else if (topic === 'WORKOUT') {
    defaultCoverImg = '/cover-workout.png';
  }

  // Ưu tiên sử dụng ảnh Thumbnail trích xuất tại đúng 0:01s của video
  const posterImg = songResult?.thumbnailUrl || defaultCoverImg;

  // Handle Video Time Update & Playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    console.log('[DEBUG][Frame9Outcome] Nhận songResult mới:', {
      jobId: songResult?.id,
      voiceType: songResult?.voiceType,
      videoUrl: songResult?.videoUrl
    });

    try {
      video.load();
    } catch (loadErr) {
      console.warn('[DEBUG][Frame9Outcome] video.load() error:', loadErr);
    }

    const handlePlay = () => {
      console.log('[DEBUG][Frame9Outcome] Video native play event');
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.log('[DEBUG][Frame9Outcome] Video native pause event');
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => {
      console.log('[DEBUG][Frame9Outcome] Video native ended event');
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    // Tự động phát (Autoplay) video ngay khi vừa vào trang
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[DEBUG][Frame9Outcome] Autoplay phát thành công với âm thanh');
          setIsPlaying(true);
        })
        .catch(() => {
          // Nếu trình duyệt chặn âm thanh tự động, phát không tiếng để sẵn sàng
          video.muted = true;
          video.play()
            .then(() => setIsPlaying(true))
            .catch((e2) => console.warn('[DEBUG][Frame9Outcome] Autoplay tắt tiếng cũng bị chặn:', e2));
        });
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [songResult]);

  // Sync isPlaying state with Video Element
  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const video = videoRef.current;
    console.log('[DEBUG][Frame9Outcome] Bấm togglePlay. Trạng thái:', {
      hasRef: !!video,
      paused: video?.paused,
      muted: video?.muted,
      currentTime: video?.currentTime
    });

    if (!video) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (video.paused || video.ended) {
      // Khi user chủ động bấm, mở tiếng
      video.muted = false;
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          console.log('[DEBUG][Frame9Outcome] Phát video thành công có tiếng');
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('[DEBUG][Frame9Outcome] Bị chặn phát có tiếng, phát tắt tiếng:', err);
          video.muted = true;
          video.play()
            .then(() => setIsPlaying(true))
            .catch((e2) => {
              console.error('[DEBUG][Frame9Outcome] Lỗi phát video:', e2);
              setIsPlaying(false);
            });
        });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const renderDownloadToast = () => (
    <>
      {/* TOAST TRẠNG THÁI TẢI / LƯU VIDEO VÀO ALBUM ẢNH */}
      {downloadToastText && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] max-w-[92vw] bg-[#003617]/95 border-2 border-[#76FF03] text-white px-5 py-3 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.8)] flex items-center gap-3 backdrop-blur-md">
          {isDownloading && <Loader2 className="w-5 h-5 text-[#FFDF00] animate-spin shrink-0" />}
          <span className="font-bold text-xs sm:text-sm text-[#FFDF00] tracking-wide text-center">
            {downloadToastText}
            {isDownloading && downloadProgress !== null ? ` ${downloadProgress}%` : ''}
          </span>
        </div>
      )}
      <SaveToPhotosPrompt isOpen={needsSecondTap} onSave={handleDownload} onClose={dismissSecondTap} />
    </>
  );

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="flex flex-col items-center justify-center h-full max-h-[96vh] w-full max-w-lg lg:max-w-xl mx-auto my-auto py-1 lg:py-2 text-center select-none z-10"
      >
        {renderDownloadToast()}
        {/* Container Dọc Toàn Diện Hiển Thị Trọn Vẹn Video Render Thành Phẩm */}
        <div className="flex flex-col items-center w-full gap-2 lg:gap-3 my-auto">
          {/* 1. Toàn bộ Video Thành Phẩm Chiếm Trọn Container (Tỉ lệ 9:16 sắc nét - Tự co giãn theo màn hình laptop 13") */}
          <div 
            onClick={togglePlay}
            className="relative h-[50vh] sm:h-[53vh] min-h-[290px] max-h-[450px] lg:max-h-[490px] xl:max-h-[530px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.6)] cursor-pointer group hover:scale-[1.02] transition-transform shrink-0 bg-black flex items-center justify-center"
          >
            <video
              key={songResult?.videoUrl || songResult?.id}
              ref={videoRef}
              src={songResult?.videoUrl || undefined}
              poster={posterImg}
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Play/Pause Overlay Icon khi hover hoặc pause */}
            <div className={`absolute inset-0 bg-black/25 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
              <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-black/60 border-2 border-[#76FF03] flex items-center justify-center shadow-[0_0_20px_rgba(118,255,3,0.6)]">
                {isPlaying ? (
                  <Pause className="w-7 h-7 lg:w-8 lg:h-8 text-[#76FF03] fill-current" />
                ) : (
                  <Play className="w-7 h-7 lg:w-8 lg:h-8 text-[#FFDF00] fill-[#FFDF00] ml-1" />
                )}
              </div>
            </div>

            {/* Mini Progress Bar dưới chân video */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
              <div 
                className="h-full bg-[#76FF03] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 2. 3 Action Buttons Phía Dưới (To rõ, vừa vặn không bị tràn trên màn hình laptop 13") */}
          <div className="flex items-center justify-center gap-3 lg:gap-4 mt-2 lg:mt-2.5 shrink-0">
            {/* Thử giọng khác */}
            <div
              onClick={handleTryOtherVoice}
              className="cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
            >
              <img
                src="/Milo---Desktop---2809_0002_Button-copy-9.png"
                alt="Thử giọng khác"
                className="h-10.5 sm:h-11 lg:h-12 xl:h-13.5 w-auto object-contain drop-shadow-xl"
              />
            </div>

            {/* Tạo bài mới */}
            <div
              onClick={handleCreateNew}
              className="cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
            >
              <img
                src="/Milo---Desktop---2809_0001_Button-copy-10.png"
                alt="Tạo bài mới"
                className="h-10.5 sm:h-11 lg:h-12 xl:h-13.5 w-auto object-contain drop-shadow-xl"
              />
            </div>

            {/* Tải xuống */}
            <div
              onClick={handleDownload}
              className="cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform relative flex items-center justify-center"
              title={`Tải video (${videoFileName})`}
            >
              <img
                src="/Milo---Desktop---2809_0000_Button-copy-13.png"
                alt="Tải xuống"
                className={`h-10.5 sm:h-11 lg:h-12 xl:h-13.5 w-auto object-contain drop-shadow-xl transition-opacity ${isDownloading ? 'opacity-40' : 'opacity-100'}`}
              />
              {isDownloading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 lg:w-6 lg:h-6 text-white animate-spin drop-shadow" />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Mobile View (< 768px)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex-1 flex flex-col items-center justify-between p-3 py-2 select-none w-full max-w-sm mx-auto my-auto"
    >
      {renderDownloadToast()}
      {/* 1. Toàn bộ Video Thành Phẩm 9:16 trên Mobile */}
      <div 
        onClick={togglePlay}
        className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-[9/16] rounded-2xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.6)] cursor-pointer group hover:scale-[1.02] active:scale-95 transition-transform shrink-0 bg-black flex items-center justify-center my-auto"
      >
        <video
          key={songResult?.videoUrl || songResult?.id}
          ref={videoRef}
          src={songResult?.videoUrl || undefined}
          poster={posterImg}
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Play/Pause Overlay Icon khi pause hoặc touch */}
        <div className={`absolute inset-0 bg-black/25 flex items-center justify-center transition-opacity ${isPlaying ? 'opacity-0' : 'opacity-100'}`}>
          <div className="w-14 h-14 rounded-full bg-black/60 border-2 border-[#76FF03] flex items-center justify-center shadow-[0_0_15px_rgba(118,255,3,0.6)]">
            {isPlaying ? (
              <Pause className="w-7 h-7 text-[#76FF03] fill-current" />
            ) : (
              <Play className="w-7 h-7 text-[#FFDF00] fill-[#FFDF00] ml-0.5" />
            )}
          </div>
        </div>

        {/* Mini Progress Bar dưới chân video */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
          <div 
            className="h-full bg-[#76FF03] transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 2. 3 End Action Buttons */}
      <div className="flex flex-col items-center gap-2.5 w-full mt-3 pb-2">
        {/* Row 1: Thử giọng khác & Tạo bài mới */}
        <div className="flex items-center justify-center gap-2.5 w-full">
          {/* Thử giọng khác */}
          <button
            type="button"
            onClick={handleTryOtherVoice}
            className="hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent cursor-pointer p-0 flex-1 max-w-[155px]"
          >
            <img
              src="/btn-change-voice.png"
              alt="Thử giọng khác"
              className="w-full h-auto object-contain drop-shadow"
            />
          </button>

          {/* Tạo bài mới */}
          <button
            type="button"
            onClick={handleCreateNew}
            className="hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent cursor-pointer p-0 flex-1 max-w-[155px]"
          >
            <img
              src="/btn-create-new.png"
              alt="Tạo bài mới"
              className="w-full h-auto object-contain drop-shadow"
            />
          </button>
        </div>

        {/* Row 2: Tải xuống */}
        <div className="flex items-center justify-center w-full">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent cursor-pointer p-0 max-w-[155px] relative flex items-center justify-center"
            id="btn-download-video"
            aria-label={canSaveToPhotos ? 'Lưu video vào Album ảnh' : 'Tải video'}
            title={`Tải video (${videoFileName})`}
          >
            <img
              src="/btn-download.png"
              alt="Tải xuống"
              className={`w-full h-auto object-contain drop-shadow transition-opacity ${isDownloading ? 'opacity-40' : 'opacity-100'}`}
            />
            {isDownloading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-white animate-spin drop-shadow" />
              </div>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
