import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { StepProgressBar } from '../ui/StepProgressBar';
import type { CheerTopic } from '../../types/cheer';

export const Frame7TopicSelect: React.FC = () => {
  const { formData, updateFormData, setStep, generateSongResult } = useCheerCampaign();
  const [selectedTopic, setSelectedTopic] = useState<CheerTopic>(formData.topic || 'STUDY');
  const isDesktop = useIsDesktop();

  console.log('[DEBUG][Frame7TopicSelect] Render frame chọn chủ đề, selectedTopic:', selectedTopic);

  const topics: { key: CheerTopic; img: string; altText: string }[] = [
    {
      key: 'STUDY',
      img: '/topic_item_hoc.png',
      altText: 'HỌC TỚI CÙNG'
    },
    {
      key: 'WORK',
      img: '/topic_item_lam.png',
      altText: 'LÀM TỚI CÙNG'
    },
    {
      key: 'WORKOUT',
      img: '/topic_item_tap.png',
      altText: 'TẬP TỚI CÙNG'
    }
  ];

  const handleProceed = (topicToUse?: CheerTopic) => {
    const topic = topicToUse || selectedTopic;
    setSelectedTopic(topic);
    updateFormData({ topic });
    generateSongResult();
    setStep('FRAME_8_LOADING');
  };

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="flex flex-col items-center justify-between w-full max-w-[540px] xl:max-w-[580px] h-full mx-auto pt-[4vh] lg:pt-[5vh] pb-3 lg:pb-4 text-center select-none z-10 relative"
      >
        {/* Progress Bar (Nằm sát trên cùng) với 2 nút Arrow căn 2 mép cột guideline */}
        <div className="w-full shrink-0 z-20">
          <StepProgressBar
            currentStepNumber={4}
            onPrev={() => setStep('FRAME_6_INFO')}
            onNext={() => handleProceed()}
            isDesktop={true}
          />
        </div>

        {/* Cụm giữa: Title + 3 Topics bậc thang đối xứng */}
        <div className="flex-1 flex flex-col items-center justify-center w-full my-auto py-1">
          {/* Title: Bạn muốn cổ vũ để (Group-33.png) */}
          <div className="flex items-center justify-center mb-3 lg:mb-4 mt-1.5 lg:mt-2">
            <img
              src="/topic_title_group33.png"
              alt="Bạn muốn cổ vũ để"
              className="h-11 lg:h-13 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform"
            />
          </div>

          {/* 3 Topics Centered & Arranged in a Symmetrical Staircase */}
          <div className="flex flex-col gap-2.5 lg:gap-3.5 w-full max-w-lg mx-auto items-center justify-center">
            {topics.map(({ key, img, altText }, idx) => {
              const isSelected = selectedTopic === key;
              const staircaseOffset = [
                '-translate-x-12 lg:-translate-x-16',   // Hàng 1: HỌC TỚI CÙNG (lệch trái)
                'translate-x-0',                        // Hàng 2: LÀM TỚI CÙNG (ở giữa)
                'translate-x-12 lg:translate-x-16'      // Hàng 3: TẬP TỚI CÙNG (lệch phải)
              ];

              return (
                <motion.div
                  key={key}
                  whileHover={{ scale: isSelected ? 1.08 : 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    console.log('[DEBUG][Frame7TopicSelect] Desktop chọn chủ đề:', key);
                    setSelectedTopic(key);
                  }}
                  className={`cursor-pointer select-none transition-all duration-300 flex items-center justify-center relative ${staircaseOffset[idx]} ${
                    isSelected
                      ? 'scale-108 z-10'
                      : 'opacity-60 hover:opacity-90 brightness-90 hover:brightness-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={altText}
                    className={`h-16 lg:h-20 xl:h-22 w-auto object-contain pointer-events-none transition-all duration-300 ${
                      isSelected
                        ? 'drop-shadow-[0_0_16px_rgba(40,255,82,0.9)] drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] brightness-110'
                        : 'drop-shadow-lg'
                    }`}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Green Button: TIẾP TỤC (Nằm sát dưới cùng, tràn đầy 2 mép guideline cột giữa) */}
        <div className="w-full flex items-center justify-center pb-2 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => handleProceed()}
            className="w-full flex items-center justify-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent"
          >
            <img
              src="/topic_btn_tieptuc.png"
              alt="TIẾP TỤC"
              className="w-full h-auto object-contain max-h-13 lg:max-h-14 drop-shadow-2xl"
            />
          </button>
        </div>
      </motion.div>
    );
  }

  // Mobile View (< 768px) - Phóng to chuẩn 100% Ảnh Mẫu
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full flex-1 flex flex-col justify-between px-3 xs:px-4 py-2 pb-6"
    >
      <div className="flex flex-col items-center w-full">
        {/* 4-Step Progress Bar với 2 nút Arrow */}
        <div className="w-full py-1 mt-1 mb-3">
          <StepProgressBar
            currentStepNumber={4}
            onPrev={() => setStep('FRAME_6_INFO')}
            onNext={() => handleProceed()}
            isDesktop={false}
          />
        </div>

        {/* Title Banner (Group-33.png: Bạn muốn cổ vũ để) */}
        <div className="flex items-center justify-center text-center my-2 w-full">
          <img
            src="/topic_title_group33.png"
            alt="Bạn muốn cổ vũ để"
            className="h-11 sm:h-13 w-auto object-contain drop-shadow-lg scale-105"
          />
        </div>

        {/* 3 Topic Items Phóng to to rõ & Bậc thang đối xứng chuẩn Ảnh Mẫu Mobile */}
        <div className="flex flex-col gap-6 sm:gap-7 w-full max-w-[380px] my-4 sm:my-6 px-1 items-center justify-center mx-auto">
          {topics.map(({ key, img, altText }, idx) => {
            const isSelected = selectedTopic === key;
            const mobileStaircase = [
              '-translate-x-8 sm:-translate-x-10',   // Hàng 1: HỌC TỚI CÙNG (lệch trái)
              'translate-x-0',                       // Hàng 2: LÀM TỚI CÙNG (ở giữa)
              'translate-x-8 sm:translate-x-10'       // Hàng 3: TẬP TỚI CÙNG (lệch phải)
            ];

            return (
              <motion.div
                key={key}
                whileHover={{ scale: isSelected ? 1.08 : 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  console.log('[DEBUG][Frame7TopicSelect] Mobile chọn chủ đề:', key);
                  setSelectedTopic(key);
                }}
                className={`cursor-pointer select-none transition-all duration-200 flex items-center justify-center relative ${mobileStaircase[idx]} ${
                  isSelected
                    ? 'scale-108 z-10'
                    : 'opacity-60 hover:opacity-90 brightness-90 hover:brightness-100'
                }`}
              >
                <img
                  src={img}
                  alt={altText}
                  className={`h-24 sm:h-28 w-auto object-contain pointer-events-none transition-all duration-200 ${
                    isSelected
                      ? 'drop-shadow-[0_0_16px_rgba(40,255,82,0.9)] drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] brightness-110'
                      : 'drop-shadow-lg'
                  }`}
                />
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Button TIẾP TỤC (Button.png) */}
      <button
        type="button"
        onClick={() => handleProceed()}
        className="w-full flex items-center justify-center cursor-pointer select-none py-1 mt-3 mb-1 hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent"
      >
        <img
          src="/topic_btn_tieptuc.png"
          alt="TIẾP TỤC"
          className="h-14 sm:h-16 w-auto object-contain drop-shadow-2xl"
        />
      </button>
    </motion.div>
  );
};
