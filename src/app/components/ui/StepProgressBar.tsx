import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface StepProgressBarProps {
  currentStepNumber: 1 | 2 | 3 | 4;
  onPrev?: () => void;
  onNext?: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  isLoading?: boolean;
  className?: string;
  isDesktop?: boolean;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStepNumber,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  isLoading = false,
  className = '',
  isDesktop = false,
}) => {
  if (isDesktop) {
    return (
      <div
        className={`w-full flex flex-col items-center select-none pointer-events-auto ${className}`}
      >
        {/* Dòng 1 (Ở TRÊN): 2 nút Arrow điều hướng nằm ở hàng trên, căn sát 2 bên mép cột */}
        <div className="w-full flex items-center justify-between px-1">
          {/* Nút Arrow Trái (<) */}
          <button
            type="button"
            onClick={onPrev}
            disabled={prevDisabled || isLoading}
            aria-label="Quay lại bước trước"
            title="Bước trước"
            className="w-8.5 h-8.5 lg:w-9.5 lg:h-9.5 xl:w-10 xl:h-10 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4.5 h-4.5 lg:w-5 lg:h-5 text-white stroke-[2.5] -translate-x-[0.5px]" />
          </button>

          {/* Nút Arrow Phải (>) */}
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || isLoading}
            aria-label="Tiếp tục bước sau"
            title="Bước tiếp theo"
            className="w-8.5 h-8.5 lg:w-9.5 lg:h-9.5 xl:w-10 xl:h-10 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <ChevronRight className="w-4.5 h-4.5 lg:w-5 lg:h-5 text-white stroke-[2.5] translate-x-[0.5px]" />
          </button>
        </div>

        {/* Dòng 2 (Ở DƯỚI): Thanh tiến trình 4 gạch nằm ngay dưới 2 nút Arrow, trải rộng tràn 2 bên */}
        <div className="w-full flex items-center justify-between gap-2.5 lg:gap-3.5 mt-2 px-1">
          {[1, 2, 3, 4].map((step) => {
            const isActive = step === currentStepNumber;
            return (
              <div
                key={step}
                className={`flex-1 transition-all duration-300 rounded-full h-2 lg:h-2.5 ${
                  isActive
                    ? 'bg-[#28FF52] shadow-[0_0_12px_rgba(40,255,82,0.95)] opacity-100'
                    : 'bg-[#002B12]/80 border border-[#28FF52]/20 shadow-none'
                }`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile View: 2 Arrow ở HÀNG TRÊN, thanh progress bar ở HÀNG DƯỚI (Chuẩn theo ảnh mẫu 1 & 2)
  return (
    <div
      className={`w-full flex flex-col items-center select-none pointer-events-auto px-1 ${className}`}
    >
      {/* Dòng 1 (Ở TRÊN): 2 nút Arrow điều hướng nằm ở hàng trên */}
      <div className="w-full flex items-center justify-between">
        {/* Nút Arrow Trái (<) */}
        <button
          type="button"
          onClick={onPrev}
          disabled={prevDisabled || isLoading}
          aria-label="Quay lại bước trước"
          title="Bước trước"
          className="w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4.5 h-4.5 text-white stroke-[2.5] -translate-x-[0.5px]" />
        </button>

        {/* Nút Arrow Phải (>) */}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled || isLoading}
          aria-label="Tiếp tục bước sau"
          title="Bước tiếp theo"
          className="w-8 h-8 rounded-full border-[1.5px] border-white flex items-center justify-center bg-black/35 backdrop-blur-[1px] hover:bg-white/20 active:scale-90 transition-all text-white shrink-0 cursor-pointer drop-shadow z-20 disabled:opacity-30 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <ChevronRight className="w-4.5 h-4.5 text-white stroke-[2.5] translate-x-[0.5px]" />
        </button>
      </div>

      {/* Dòng 2 (Ở DƯỚI): Thanh tiến trình 4 gạch nằm ngay dưới 2 nút Arrow */}
      <div className="w-full flex items-center justify-between gap-2 sm:gap-2.5 mt-2">
        {[1, 2, 3, 4].map((step) => {
          const isActive = step === currentStepNumber;
          return (
            <div
              key={step}
              className={`flex-1 transition-all duration-300 rounded-full h-1.5 sm:h-2 ${
                isActive
                  ? 'bg-[#28FF52] shadow-[0_0_12px_rgba(40,255,82,0.95)] opacity-100'
                  : 'bg-[#002B12]/80 border border-[#28FF52]/20 shadow-none'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StepProgressBar;
