import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { CheerCampaignProvider, useCheerCampaign } from './app/context/CheerCampaignContext';
import { CampaignLayout } from './app/components/layout/CampaignLayout';
import { Frame1Opening } from './app/components/features/Frame1Opening';
import { Frame2Onboarding } from './app/components/features/Frame2Onboarding';
import { Frame3TnC } from './app/components/features/Frame3TnC';
import { Frame4PhoneOtp } from './app/components/features/Frame4PhoneOtp';
import { Frame6InfoUpload } from './app/components/features/Frame6InfoUpload';
import { Frame7TopicSelect } from './app/components/features/Frame7TopicSelect';
import { Frame8Loading } from './app/components/features/Frame8Loading';
import { Frame9Outcome } from './app/components/features/Frame9Outcome';
import { DashboardPage } from './app/pages/DashboardPage';

const StepRenderer: React.FC = () => {
  const { currentStep } = useCheerCampaign();

  const renderStep = () => {
    switch (currentStep) {
      case 'FRAME_1_OPENING':
        return <Frame1Opening key="frame1" />;
      case 'FRAME_2_ONBOARDING':
        return <Frame2Onboarding key="frame2" />;
      case 'FRAME_3_TNC':
        return <Frame3TnC key="frame3" />;
      case 'FRAME_4_PHONE':
      case 'FRAME_5_OTP':
        return <Frame4PhoneOtp key="frame4" />;
      case 'FRAME_6_INFO':
        return <Frame6InfoUpload key="frame6" />;
      case 'FRAME_7_TOPIC':
        return <Frame7TopicSelect key="frame7" />;
      case 'FRAME_8_LOADING':
        return <Frame8Loading key="frame8" />;
      case 'FRAME_9_OUTCOME':
        return <Frame9Outcome key="frame9" />;
      default:
        return <Frame1Opening key="frame1" />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {renderStep()}
    </AnimatePresence>
  );
};

export function App() {
  // Kiểm tra xem URL có yêu cầu trang dashboard không (/dashboard, #dashboard, ?dashboard)
  const isDashboardUrl = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path.includes('/dashboard') ||
      search.includes('dashboard') ||
      hash.includes('dashboard')
    );
  };

  const [isDashboardView, setIsDashboardView] = useState<boolean>(isDashboardUrl());

  useEffect(() => {
    const handleUrlChange = () => {
      setIsDashboardView(isDashboardUrl());
    };

    // Phím tắt bí mật dành cho Admin: Ctrl + Shift + D (hoặc Cmd + Shift + D trên Mac)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (isDashboardView) {
          window.history.pushState({}, '', window.location.pathname);
          setIsDashboardView(false);
        } else {
          window.history.pushState({}, '', '#dashboard');
          setIsDashboardView(true);
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDashboardView]);

  const closeDashboard = () => {
    window.history.pushState({}, '', window.location.pathname);
    setIsDashboardView(false);
  };

  if (isDashboardView) {
    return <DashboardPage onBackToCampaign={closeDashboard} />;
  }

  return (
    <CheerCampaignProvider>
      <CampaignLayout>
        <StepRenderer />
      </CampaignLayout>
    </CheerCampaignProvider>
  );
}

export default App;
