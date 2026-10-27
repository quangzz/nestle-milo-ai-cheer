import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';

const LOADING_CAPTIONS: string[] = [
  'Okay, vào việc!…',
  '“Ông chả húi, bà chả hơm” đợi xíu…',
  '+1 máy tút lại cái hình cho đẹp nè',
  'Ca sĩ đang lấy hơi, chờ xíu nhooo_',
  'Đang viết lời cho thiệt là “wow”',
  'Producer đang mix nhạc um sùm',
  'Đừng out vội, mốt lại ước ao được cổ vũ đó…',
  'Ráng đợi tới cùng nha, giờ out là uổng á!',
  'Soạn sẵn cái caption đi, chuẩn bị share bài nè!',
  'Nhắm mắt đếm ngược đi',
  '3…2…1… Yass!!!! Nhận hàng nha'
];

export const Frame8Loading: React.FC = () => {
  const { setStep, formData, generateSongWithBackend } = useCheerCampaign();
  const [progress, setProgress] = useState(0);
  const [captionIndex, setCaptionIndex] = useState(0);

  // Kích hoạt sinh bài nhạc & render video từ Local Backend
  useEffect(() => {
    let isMounted = true;
    let targetVoice = formData.voiceType || '01';
    try {
      const storedVoice = sessionStorage.getItem('milo_target_voice');
      if (storedVoice && ['01', '02', '03', '04'].includes(storedVoice)) {
        targetVoice = storedVoice as '01' | '02' | '03' | '04';
        sessionStorage.removeItem('milo_target_voice');
      }
    } catch {}

    console.log(`[DEBUG][Frame8Loading] Bắt đầu render bài hát cho voiceType: ${targetVoice}`);

    generateSongWithBackend((percent) => {
      if (isMounted) {
        setProgress(prev => Math.max(prev, percent));
      }
    }, targetVoice).then((res) => {
      console.log('[DEBUG][Frame8Loading] Tạo video thành công:', res);
      if (isMounted) {
        setProgress(100);
        setTimeout(() => {
          setStep('FRAME_9_OUTCOME');
        }, 500);
      }
    }).catch((err) => {
      console.error('[DEBUG][Frame8Loading] Lỗi trong quá trình tạo video:', err);
      if (isMounted) {
        setProgress(100);
        setTimeout(() => {
          setStep('FRAME_9_OUTCOME');
        }, 500);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Smooth Progress animation fallback if progress is slow
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev;
        return prev + 1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Hiển thị mỗi câu trong ~2.8s để người dùng kịp đọc trọn vẹn và thoải mái
  useEffect(() => {
    const captionTimer = setInterval(() => {
      setCaptionIndex(prev => (prev + 1) % LOADING_CAPTIONS.length);
    }, 2800);
    return () => clearInterval(captionTimer);
  }, []);

  // SVG Circle calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex-1 flex flex-col items-center justify-center text-center p-4 my-auto select-none"
    >
      {/* Centered Loading Cluster */}
      <div className="flex flex-col items-center justify-center w-full gap-7 sm:gap-8 my-auto">
        {/* 1. Circular Progress Indicator (Screen 8/9 - Không Shadow) */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
          {/* SVG Animated Ring */}
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
            {/* White Track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="white"
              strokeWidth="5"
              fill="transparent"
              className="opacity-90"
            />
            {/* Neon Green Progress Arc (Sắc nét, không filter bóng) */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#28FF52"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 80ms ease-out'
              }}
            />
          </svg>

          {/* Percentage Text in Center (Font RoadRage đặc trưng Milo) */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-5xl sm:text-6xl font-normal text-white tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
              style={{
                fontFamily: "'RoadRage', cursive, sans-serif"
              }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* 2. Horizontal Progress Bar (Cố định chiều rộng không bị co giãn) */}
        <div className="w-[280px] sm:w-[320px] max-w-[90vw] flex flex-col items-center gap-2 shrink-0">
          <div className="w-full h-2.5 sm:h-3 rounded-full bg-[#002B12] border border-white/30 overflow-hidden relative">
            <motion.div
              className="h-full bg-white relative rounded-full"
              style={{
                width: `${progress}%`
              }}
            >
              {/* Green Leading Edge */}
              <div className="absolute right-0 top-0 bottom-0 w-3 bg-[#28FF52]" />
            </motion.div>
          </div>
        </div>

        {/* 3. Rotating Loading Captions Text (Font RoadRage đặc trưng Milo) - Cỡ chữ to rõ ràng */}
        <div className="w-full max-w-[520px] sm:max-w-[600px] min-h-[76px] sm:min-h-[90px] flex items-center justify-center px-4 overflow-hidden shrink-0">
          <AnimatePresence mode="wait">
            <motion.p
              key={captionIndex}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="text-[#E2FCE5] text-[25px] xs:text-[27px] sm:text-[32px] md:text-[36px] lg:text-[40px] font-normal tracking-wide text-center leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]"
              style={{
                fontFamily: "'RoadRage', cursive, sans-serif"
              }}
            >
              {LOADING_CAPTIONS[captionIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
