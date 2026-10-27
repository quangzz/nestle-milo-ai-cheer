import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';

interface CampaignLayoutProps {
  children: React.ReactNode;
}

export const CampaignLayout: React.FC<CampaignLayoutProps> = ({ children }) => {
  const { currentStep } = useCheerCampaign();
  const isDesktop = useIsDesktop();

  return (
    <div 
      className="w-full min-h-screen md:h-screen flex flex-col justify-between items-center relative p-0 overflow-x-hidden md:overflow-hidden bg-[#00481F] bg-cover bg-center bg-no-repeat transition-all duration-300"
      style={
        isDesktop
          ? {
              backgroundImage: `url('/desktop-bg-moi.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat'
            }
          : undefined
      }
    >
      {/* Main Container: Full Screen Canvas on Desktop, Centered Mobile Phone Frame on Mobile */}
      <div 
        className={
          isDesktop
            ? "w-full h-screen bg-transparent flex flex-col justify-between relative z-10 mx-auto px-4 lg:px-8 xl:px-12 pt-0 pb-2 lg:pb-3 xl:pb-4 overflow-hidden"
            : "w-full max-w-md min-h-screen sm:min-h-[100dvh] bg-[#005C28] bg-cover bg-center bg-no-repeat sm:rounded-3xl shadow-2xl border-0 flex flex-col justify-between relative transition-all duration-300 mx-auto"
        }
        style={!isDesktop ? { backgroundImage: `url('/PNG/bgmobile.png')` } : undefined}
      >
        {/* Top Header Bar (Mobile only) */}
        <Header />

        {/* Dynamic Step View Content (Hỗ trợ cuộn trang mượt mà khi chiều dọc màn hình bé) */}
        <main className={`flex-1 flex flex-col items-center z-10 relative p-0 w-full overflow-y-auto no-scrollbar ${currentStep === 'FRAME_8_LOADING' ? 'justify-center' : 'justify-between'}`}>
          {children}
        </main>

        {/* Footer Bar (Mobile only, hidden on steps with custom bottom) */}
        {!isDesktop && currentStep !== 'FRAME_7_TOPIC' && currentStep !== 'FRAME_8_LOADING' && currentStep !== 'FRAME_3_TNC' && <Footer />}
      </div>
    </div>
  );
};
