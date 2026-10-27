import React from 'react';
import { motion } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export const Frame1Opening: React.FC = () => {
  const { setStep } = useCheerCampaign();
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="flex flex-col items-center justify-center w-full max-w-xl mx-auto my-auto text-center z-10 select-none py-6"
      >
        {/* Center Graphic: MILO_OpeningFrame.png (Không drop shadow theo yêu cầu) */}
        <div className="flex items-center justify-center w-full mb-8">
          <img
            src="/MILO_OpeningFrame.png"
            alt="DỊCH VỤ CỔ VŨ MILO"
            className="w-full max-w-[420px] lg:max-w-[460px] h-auto object-contain hover:scale-105 transition-transform"
          />
        </div>

        {/* Nút Xanh: TẠO NGAY! */}
        <div
          onClick={() => setStep('FRAME_2_ONBOARDING')}
          className="flex items-center justify-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform"
        >
          <img
            src="/Milo---Desktop---2809_0000_Group-6-copy.png"
            alt="TẠO NGAY!"
            className="h-14 lg:h-16 w-auto object-contain drop-shadow-2xl"
          />
        </div>
      </motion.div>
    );
  }

  // Mobile View (< 768px)
  return (
    <div className="w-full flex-1 flex flex-col justify-between items-center text-center px-3 py-2 relative select-none">
      {/* Key Visual Image: MILO_OpeningFrame.png (Phóng to rõ ràng theo yêu cầu) */}
      <div className="w-full flex-1 flex items-center justify-center my-auto py-2">
        <img
          src="/MILO_OpeningFrame.png"
          alt="DỊCH VỤ CỔ VŨ MILO"
          className="w-full max-w-[380px] xs:max-w-[410px] sm:max-w-[440px] h-auto max-h-[60vh] object-contain drop-shadow-none"
        />
      </div>

      {/* Button: TẠO NGAY! (Phóng to kích thước) */}
      <div
        onClick={() => setStep('FRAME_2_ONBOARDING')}
        className="w-full flex items-center justify-center cursor-pointer select-none py-1 mb-2 sm:mb-3 hover:scale-105 active:scale-95 transition-transform"
      >
        <img
          src="/milo_0000_Button-Tao-ngay.png"
          alt="TẠO NGAY!"
          className="h-14 xs:h-[58px] sm:h-16 w-auto object-contain drop-shadow-xl"
        />
      </div>
    </div>
  );
};
