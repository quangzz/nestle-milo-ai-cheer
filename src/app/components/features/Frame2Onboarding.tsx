import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export const Frame2Onboarding: React.FC = () => {
  const { setStep } = useCheerCampaign();
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="flex flex-col items-center justify-between w-full max-w-[460px] lg:max-w-[500px] h-[84vh] max-h-[660px] mx-auto my-auto py-2 text-center select-none z-10 relative"
      >
        {/* Top Header: 2 Navigation Arrows (< and >) and Center Title (Khớp 100% Guideline trên cùng của Desktop) */}
        <div className="w-full relative flex items-center justify-center pt-1">
          {/* Arrow Trái (<) */}
          <button
            type="button"
            onClick={() => setStep('FRAME_1_OPENING')}
            aria-label="Quay lại bước trước"
            title="Bước trước"
            className="absolute left-0 top-3 lg:top-4 w-8 h-8 lg:w-9 lg:h-9 rounded-full border-[1.5px] lg:border-2 border-white flex items-center justify-center bg-black/25 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20"
          >
            <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5 text-white stroke-[2.5] -translate-x-[0.5px]" />
          </button>

          {/* Title: 3 BƯỚC E-ZÌ TẠO BÀI CỔ VŨ */}
          <div className="flex items-center justify-center w-full px-10">
            <img
              src="/desktop-onboarding-title-2809.png"
              alt="3 BƯỚC E-ZÌ TẠO BÀI CỔ VŨ"
              className="w-full max-w-[280px] sm:max-w-[310px] lg:max-w-[340px] h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform"
            />
          </div>

          {/* Arrow Phải (>) */}
          <button
            type="button"
            onClick={() => setStep('FRAME_3_TNC')}
            aria-label="Tiếp tục bước sau"
            title="Bước tiếp theo"
            className="absolute right-0 top-3 lg:top-4 w-8 h-8 lg:w-9 lg:h-9 rounded-full border-[1.5px] lg:border-2 border-white flex items-center justify-center bg-black/25 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20"
          >
            <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 text-white stroke-[2.5] translate-x-[0.5px]" />
          </button>
        </div>

        {/* 3 Steps Vertical List - Typography Text chuẩn font RoadRage sắc nét, đồng bộ */}
        <div className="flex flex-col gap-6 lg:gap-7 w-fit mx-auto my-auto items-start justify-center">
          {/* Step 1: 1 NHẬP THÔNG TIN */}
          <div className="flex items-center gap-4 lg:gap-5 hover:scale-105 transition-transform select-none">
            <img
              src="/desktop-step-1.png"
              alt="1"
              className="w-12 h-12 lg:w-14 lg:h-14 object-contain drop-shadow-md shrink-0 scale-105"
            />
            <span
              className="text-white text-[36px] lg:text-[42px] font-normal tracking-wide leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] uppercase select-none"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              NHẬP THÔNG TIN
            </span>
          </div>

          {/* Step 2: 2 THÊM ẢNH */}
          <div className="flex items-center gap-4 lg:gap-5 hover:scale-105 transition-transform select-none">
            <img
              src="/desktop-step-2.png"
              alt="2"
              className="w-12 h-12 lg:w-14 lg:h-14 object-contain drop-shadow-md shrink-0 scale-105"
            />
            <span
              className="text-white text-[36px] lg:text-[42px] font-normal tracking-wide leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] uppercase select-none"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              THÊM ẢNH
            </span>
          </div>

          {/* Step 3: 3 CHỌN CHỦ ĐỀ */}
          <div className="flex items-center gap-4 lg:gap-5 hover:scale-105 transition-transform select-none">
            <img
              src="/desktop-step-3.png"
              alt="3"
              className="w-12 h-12 lg:w-14 lg:h-14 object-contain drop-shadow-md shrink-0 scale-105"
            />
            <span
              className="text-white text-[36px] lg:text-[42px] font-normal tracking-wide leading-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)] uppercase select-none"
              style={{ fontFamily: "'RoadRage', sans-serif" }}
            >
              CHỌN CHỦ ĐỀ
            </span>
          </div>
        </div>

        {/* Green Button: TIẾP TỤC - Rộng tràn cột giữa khớp 100% 2 đường guideline dọc Desktop */}
        <div
          onClick={() => setStep('FRAME_3_TNC')}
          className="w-full flex items-center justify-center cursor-pointer select-none pb-2 hover:scale-105 active:scale-95 transition-transform"
        >
          <img
            src="/desktop-btn-tieptuc.png"
            alt="TIẾP TỤC"
            className="w-full h-auto object-contain max-h-13 lg:max-h-14 drop-shadow-2xl"
          />
        </div>
      </motion.div>
    );
  }

  // Mobile View (< 768px)
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col justify-between items-center text-center p-3 pt-0 pb-3 select-none relative w-full overflow-y-auto no-scrollbar"
    >
      {/* Header: 2 Navigation Arrows (< and >) and Center Title (Chuyển 2 arrow lên trên ngang hàng với dòng 3 BƯỚC E-ZÌ) */}
      <div className="w-full relative flex items-center justify-center mt-1 mb-2 px-1 shrink-0 min-h-[52px]">
        {/* Arrow Trái (<) */}
        <button
          type="button"
          onClick={() => setStep('FRAME_1_OPENING')}
          aria-label="Quay lại bước trước"
          title="Bước trước"
          className="absolute left-1 top-1 sm:top-1.5 w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow-md z-20"
        >
          <ChevronLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white stroke-[2.5] -translate-x-[0.5px]" />
        </button>

        {/* Title: 3 BƯỚC E-ZÌ TẠO BÀI CỔ VŨ (Phóng to kích thước tối đa) */}
        <div className="flex items-center justify-center w-full px-8 xs:px-9">
          <img
            src="/desktop-onboarding-title-exact.png"
            alt="3 BƯỚC E-ZÌ TẠO BÀI CỔ VŨ"
            className="w-full max-w-[310px] xs:max-w-[340px] sm:max-w-[380px] h-auto object-contain drop-shadow-xl hover:scale-105 transition-transform"
          />
        </div>

        {/* Arrow Phải (>) */}
        <button
          type="button"
          onClick={() => setStep('FRAME_3_TNC')}
          aria-label="Tiếp tục bước sau"
          title="Bước tiếp theo"
          className="absolute right-1 top-1 sm:top-1.5 w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow-md z-20"
        >
          <ChevronRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white stroke-[2.5] translate-x-[0.5px]" />
        </button>
      </div>

      {/* 3 Steps To Rõ, Căn giữa hoàn hảo trên màn hình Mobile */}
      <div className="flex flex-col gap-6 xs:gap-8 sm:gap-9 w-fit mx-auto my-auto items-start justify-center py-2 px-2">
        {/* Step 1: 1 NHẬP THÔNG TIN */}
        <div className="flex items-center gap-4 xs:gap-5 sm:gap-6 hover:scale-105 transition-transform select-none">
          <img
            src="/desktop-step-1.png"
            alt="1"
            className="w-[66px] h-[66px] xs:w-[74px] xs:h-[74px] sm:w-[82px] sm:h-[82px] object-contain drop-shadow-lg shrink-0"
          />
          <span
            className="text-white text-[40px] xs:text-[46px] sm:text-[52px] font-normal tracking-wide leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] uppercase select-none whitespace-nowrap"
            style={{ fontFamily: "'RoadRage', sans-serif" }}
          >
            NHẬP THÔNG TIN
          </span>
        </div>

        {/* Step 2: 2 THÊM ẢNH */}
        <div className="flex items-center gap-4 xs:gap-5 sm:gap-6 hover:scale-105 transition-transform select-none">
          <img
            src="/desktop-step-2.png"
            alt="2"
            className="w-[66px] h-[66px] xs:w-[74px] xs:h-[74px] sm:w-[82px] sm:h-[82px] object-contain drop-shadow-lg shrink-0"
          />
          <span
            className="text-white text-[40px] xs:text-[46px] sm:text-[52px] font-normal tracking-wide leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] uppercase select-none whitespace-nowrap"
            style={{ fontFamily: "'RoadRage', sans-serif" }}
          >
            THÊM ẢNH
          </span>
        </div>

        {/* Step 3: 3 CHỌN CHỦ ĐỀ */}
        <div className="flex items-center gap-4 xs:gap-5 sm:gap-6 hover:scale-105 transition-transform select-none">
          <img
            src="/desktop-step-3.png"
            alt="3"
            className="w-[66px] h-[66px] xs:w-[74px] xs:h-[74px] sm:w-[82px] sm:h-[82px] object-contain drop-shadow-lg shrink-0"
          />
          <span
            className="text-white text-[40px] xs:text-[46px] sm:text-[52px] font-normal tracking-wide leading-none drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] uppercase select-none whitespace-nowrap"
            style={{ fontFamily: "'RoadRage', sans-serif" }}
          >
            CHỌN CHỦ ĐỀ
          </span>
        </div>
      </div>

      {/* Button TIẾP TỤC (Phóng to kích thước) */}
      <div
        onClick={() => setStep('FRAME_3_TNC')}
        className="w-full flex items-center justify-center cursor-pointer select-none py-2 mb-2 sm:mb-3 mt-auto shrink-0 hover:scale-105 active:scale-95 transition-transform"
      >
        <img
          src="/mobile-btn-tieptuc.png"
          alt="TIẾP TỤC"
          className="h-14 xs:h-[60px] sm:h-[66px] w-auto object-contain drop-shadow-xl"
        />
      </div>
    </motion.div>
  );
};
