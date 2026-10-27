import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CampaignStep, UserFormData, CheerTopic, SongResult } from '../types/cheer';
import { CHANT_DATA } from '../utils/constants';
import { getBackendEndpoints, getSavedVerificationToken } from '../utils/otpApi';

interface CheerCampaignContextType {
  currentStep: CampaignStep;
  currentStepIndex: number; // 1 to 9
  formData: UserFormData;
  songResult: SongResult | null;
  isMuted: boolean;
  setStep: (step: CampaignStep) => void;
  goToStepByIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<UserFormData>) => void;
  resetForm: () => void;
  toggleMute: () => void;
  setSongResult: (result: SongResult | null) => void;
  generateSongResult: () => SongResult;
  generateSongWithBackend: (onProgress?: (percent: number, msg: string) => void, overrideVoiceType?: '01' | '02' | '03' | '04') => Promise<SongResult>;
}

export const STEP_ORDER: CampaignStep[] = [
  'FRAME_1_OPENING',
  'FRAME_2_ONBOARDING',
  'FRAME_3_TNC',
  'FRAME_4_PHONE',
  'FRAME_5_OTP',
  'FRAME_6_INFO',
  'FRAME_7_TOPIC',
  'FRAME_8_LOADING',
  'FRAME_9_OUTCOME'
];

export const STEP_PATH_MAP: Record<CampaignStep, string> = {
  FRAME_1_OPENING: '/',
  FRAME_2_ONBOARDING: '/step1',
  FRAME_3_TNC: '/step2',
  FRAME_4_PHONE: '/step3',
  FRAME_5_OTP: '/step4',
  FRAME_6_INFO: '/step5',
  FRAME_7_TOPIC: '/step6',
  FRAME_8_LOADING: '/step7',
  FRAME_9_OUTCOME: '/step8',
};

export const getStepFromPath = (path: string): CampaignStep => {
  const cleanPath = path.toLowerCase().replace(/\/$/, '') || '/';
  for (const [step, p] of Object.entries(STEP_PATH_MAP)) {
    if (p === cleanPath) return step as CampaignStep;
  }
  return 'FRAME_1_OPENING';
};

const CheerCampaignContext = createContext<CheerCampaignContextType | undefined>(undefined);

const initialFormData: UserFormData = {
  termsAgreed: false,
  phone: '',
  otp: '',
  recipientName: '',
  avatarUrl: null,
  topic: 'WORK',
  voiceType: '01'
};

export const CheerCampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<CampaignStep>(() => {
    return getStepFromPath(window.location.pathname);
  });

  // Tự động khôi phục formData từ localStorage khi F5
  const [formData, setFormData] = useState<UserFormData>(() => {
    try {
      const saved = localStorage.getItem('milo_form_data');
      if (saved) {
        return { ...initialFormData, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[DEBUG][CheerContext] Lỗi đọc formData từ localStorage:', e);
    }
    return initialFormData;
  });

  // Tự động khôi phục songResult video thành phẩm từ localStorage khi F5
  const [songResult, setSongResult] = useState<SongResult | null>(() => {
    try {
      const saved = localStorage.getItem('milo_song_result');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[DEBUG][CheerContext] Khôi phục video thành phẩm từ localStorage sau khi F5:', parsed.id);
        return parsed;
      }
    } catch (e) {
      console.warn('[DEBUG][CheerContext] Lỗi đọc songResult từ localStorage:', e);
    }
    return null;
  });

  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Tự động lưu formData vào localStorage
  useEffect(() => {
    try {
      if (formData) {
        localStorage.setItem('milo_form_data', JSON.stringify(formData));
      }
    } catch (e) {
      console.warn('[DEBUG][CheerContext] Lỗi lưu formData:', e);
    }
  }, [formData]);

  // Tự động lưu video thành phẩm songResult vào localStorage
  useEffect(() => {
    try {
      if (songResult) {
        localStorage.setItem('milo_song_result', JSON.stringify(songResult));
        console.log('[DEBUG][CheerContext] Đã lưu persistent songResult vào localStorage:', songResult.id);
      }
    } catch (e) {
      console.warn('[DEBUG][CheerContext] Lỗi lưu songResult:', e);
    }
  }, [songResult]);

  const currentStepIndex = STEP_ORDER.indexOf(currentStep) + 1;

  // Listen to browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const step = getStepFromPath(window.location.pathname);
      setCurrentStep(step);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setStep = (step: CampaignStep) => {
    setCurrentStep(step);
    const targetPath = STEP_PATH_MAP[step];
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  };

  const goToStepByIndex = (index: number) => {
    if (index >= 1 && index <= STEP_ORDER.length) {
      setStep(STEP_ORDER[index - 1]);
    }
  };

  const nextStep = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setStep(STEP_ORDER[currentIndex - 1]);
    }
  };

  const updateFormData = (data: Partial<UserFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const resetForm = () => {
    console.log('[DEBUG][CheerContext] Reset form & xóa dữ liệu lưu trữ F5');
    try {
      localStorage.removeItem('milo_song_result');
      localStorage.removeItem('milo_form_data');
    } catch {}
    setFormData(initialFormData);
    setSongResult(null);
    setStep('FRAME_1_OPENING');
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const generateSongResult = (): SongResult => {
    const topic: CheerTopic = formData.topic || 'WORK';
    const chant = CHANT_DATA[topic];
    const name = formData.recipientName.trim() || chant.defaultRecipient;
    
    const customizedLyrics = chant.timedLyrics.map(item => ({
      time: item.time,
      text: item.text.replace(/\{name\}/g, name)
    }));

    let fallbackVideo = '/demo_office.mp4';
    if (topic === 'STUDY') fallbackVideo = '/demo_study.mp4';
    else if (topic === 'WORKOUT') fallbackVideo = '/demo_workout.mp4';

    const result: SongResult = {
      id: 'song_' + Date.now(),
      recipientName: name,
      topic: topic,
      voiceType: formData.voiceType || '01',
      title: `Cố lên, ${name} !`,
      lyrics: customizedLyrics,
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
      videoUrl: fallbackVideo,
      thumbnailUrl: `/cover-${topic.toLowerCase()}.png`,
      avatarUrl: formData.avatarUrl || '/character.png',
      createdAt: new Date().toISOString()
    };

    setSongResult(result);
    return result;
  };

  const generateSongWithBackend = async (
    onProgress?: (percent: number, msg: string) => void,
    overrideVoiceType?: '01' | '02' | '03' | '04'
  ): Promise<SongResult> => {
    const topic: CheerTopic = formData.topic || 'WORK';
    const chant = CHANT_DATA[topic];
    const name = formData.recipientName.trim() || chant.defaultRecipient;
    const activeVoice: '01' | '02' | '03' | '04' = overrideVoiceType || formData.voiceType || '01';

    // Bắt đầu bấm giờ đo thời gian xử lý video
    const startTime = performance.now();
    const startTimeFormatted = new Date().toLocaleTimeString('vi-VN');
    console.log(
      `%c⏱️ [TIMER] BẮT ĐẦU TIẾN TRÌNH TẠO VIDEO MILO (${startTimeFormatted})`,
      'color: #FFDF00; background: #005C28; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;'
    );
    console.log(`[DEBUG][CheerContext] Thông tin: Tên="${name}", Chủ đề="${topic}", Giọng AI="${activeVoice}", LastJobId="${songResult?.id || 'NONE'}"`);

    const backendEndpoints = getBackendEndpoints();

    for (const baseUrl of backendEndpoints) {
      try {
        // Chuẩn bị FormData gửi sang Backend Server
        const bodyFormData = new FormData();
        bodyFormData.append('name', name);
        bodyFormData.append('topic', topic);
        bodyFormData.append('voiceType', activeVoice);
        if (songResult?.id) {
          bodyFormData.append('lastJobId', songResult.id);
        }

        // Đính kèm token xác thực OTP và số điện thoại (Bảo vệ API chống bot spam & DoS)
        const savedToken = getSavedVerificationToken();
        if (savedToken) {
          bodyFormData.append('verificationToken', savedToken);
        }
        const phoneToSend = formData.phone || (typeof window !== 'undefined' ? localStorage.getItem('milo_verified_phone') : null);
        if (phoneToSend) {
          bodyFormData.append('phone', phoneToSend);
        }

        if (formData.avatarUrl) {
          try {
            const res = await fetch(formData.avatarUrl);
            const blob = await res.blob();
            bodyFormData.append('avatar', blob, 'avatar.png');
          } catch (avatarFetchErr) {
            console.warn('[AVATAR_ATTACH_FAIL]', avatarFetchErr);
          }
        }

        const requestHeaders: Record<string, string> = {
          'x-milo-client': 'web',
          'x-milo-platform': 'staging'
        };
        if (savedToken) {
          requestHeaders['Authorization'] = `Bearer ${savedToken}`;
          requestHeaders['x-verification-token'] = savedToken;
        }

        // Gọi API khởi tạo job
        console.log(`[DEBUG][CheerContext] Đang thử gửi yêu cầu tạo video tới ${baseUrl}/api/generate-cheer...`, {
          name,
          topic,
          activeVoice,
          hasToken: Boolean(savedToken),
          phone: phoneToSend || 'NONE',
          lastJobId: songResult?.id || 'NONE'
        });
        const startRes = await fetch(`${baseUrl}/api/generate-cheer`, {
          method: 'POST',
          headers: requestHeaders,
          body: bodyFormData
        });

        const startContentType = startRes.headers.get('content-type') || '';
        if (!startContentType.includes('application/json')) {
          console.warn(`[DEBUG][CheerContext] ${baseUrl} trả về non-JSON content-type: ${startContentType}, bỏ qua endpoint này.`);
          continue;
        }

        if (!startRes.ok) {
          const errBody = await startRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Backend error: ${startRes.statusText}`);
        }
        const startData = await startRes.json();
        const jobId = startData.jobId;
        if (!jobId) throw new Error('Không nhận được jobId từ backend server');
        const initElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`[DEBUG][CheerContext] Đã khởi tạo job ${jobId} trên endpoint ${baseUrl} (sau ${initElapsed}s)`);

        // Polling kết quả job
        let isDone = false;
        let finalResultData = null;

        while (!isDone) {
          await new Promise(r => setTimeout(r, 1000));
          const statusRes = await fetch(`${baseUrl}/api/jobs/${jobId}/status`);
          const statusContentType = statusRes.headers.get('content-type') || '';
          if (statusRes.ok && statusContentType.includes('application/json')) {
            const statusData = await statusRes.json();
            const currentElapsed = ((performance.now() - startTime) / 1000).toFixed(1);
            console.log(`⏱️ [TIMER] Đang xử lý: ${currentElapsed}s | Tiến độ: ${statusData.progress}% - ${statusData.message}`);
            if (onProgress) onProgress(statusData.progress || 50, statusData.message || 'Đang xử lý...');

            if (statusData.status === 'SUCCESS') {
              isDone = true;
              finalResultData = statusData.result;
            } else if (statusData.status === 'FAILED') {
              throw new Error(statusData.message || 'Render video thất bại');
            }
          }
        }

        if (finalResultData) {
          const totalDurationSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
          const endTimeFormatted = new Date().toLocaleTimeString('vi-VN');

          const resolvedVideoUrl = finalResultData.videoUrl || `${baseUrl}/api/jobs/${jobId}/output.mp4`;
          const resolvedThumbnailUrl = finalResultData.thumbnailUrl || (finalResultData.firebaseStorage?.['thumbnail.jpg']) || `${baseUrl}/api/jobs/${jobId}/thumbnail.jpg`;
          const resolvedAudioUrl = finalResultData.audioUrl || `${baseUrl}/api/jobs/${jobId}/mixed_audio.mp3`;

          console.log(
            `%c🎉 [TIMER_SUCCESS] HOÀN TẤT XUẤT BẢN VIDEO THÀNH PHẨM TRONG: ${totalDurationSeconds}s (${endTimeFormatted})\n` +
            `============================================================\n` +
            `• Job ID: ${jobId}\n` +
            `• Người nhận: ${name}\n` +
            `• Chủ đề: ${topic}\n` +
            `• Giọng AI: ${activeVoice}\n` +
            `• Tổng thời gian: ${totalDurationSeconds} giây\n` +
            `• Video URL: ${resolvedVideoUrl}\n` +
            `• Thumbnail URL: ${resolvedThumbnailUrl}\n` +
            `============================================================`,
            'color: #00E676; background: #002200; font-weight: bold; font-size: 13px; padding: 6px 10px; border-radius: 4px; border-left: 4px solid #00E676;'
          );

          const result: SongResult = {
            id: jobId,
            recipientName: finalResultData.recipientName || name,
            topic: topic,
            voiceType: activeVoice,
            title: finalResultData.title || `CỔ VŨ ${name.toUpperCase()} TỚI CÙNG`,
            lyrics: chant.timedLyrics.map(item => ({
              time: item.time,
              text: item.text.replace(/\{name\}/g, name)
            })),
            audioUrl: resolvedAudioUrl,
            videoUrl: resolvedVideoUrl,
            thumbnailUrl: resolvedThumbnailUrl,
            avatarUrl: formData.avatarUrl || '/character.png',
            createdAt: new Date().toISOString()
          };
          setSongResult(result);
          return result;
        }
      } catch (err) {
        console.warn(`[DEBUG][CheerContext] Endpoint ${baseUrl} thất bại:`, err);
      }
    }

    // Fallback nếu không có local server
    const fallbackDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`[TIMER_FALLBACK] Hoàn tất fallback trong ${fallbackDuration}s`);
    return generateSongResult();
  };

  return (
    <CheerCampaignContext.Provider
      value={{
        currentStep,
        currentStepIndex,
        formData,
        songResult,
        isMuted,
        setStep,
        goToStepByIndex,
        nextStep,
        prevStep,
        updateFormData,
        resetForm,
        toggleMute,
        setSongResult,
        generateSongResult,
        generateSongWithBackend
      }}
    >
      {children}
    </CheerCampaignContext.Provider>
  );
};

export const useCheerCampaign = () => {
  const context = useContext(CheerCampaignContext);
  if (!context) {
    return {
      currentStep: 'FRAME_1_OPENING' as CampaignStep,
      currentStepIndex: 1,
      formData: initialFormData,
      songResult: null,
      isMuted: false,
      setStep: () => {},
      goToStepByIndex: () => {},
      nextStep: () => {},
      prevStep: () => {},
      updateFormData: () => {},
      resetForm: () => {},
      toggleMute: () => {},
      setSongResult: () => {},
      generateSongResult: () => ({
        id: '',
        recipientName: 'Ví dụ',
        topic: 'WORK' as CheerTopic,
        title: 'Cố lên!',
        lyrics: [],
        audioUrl: '',
        avatarUrl: '',
        createdAt: ''
      }),
      generateSongWithBackend: async () => ({
        id: '',
        recipientName: 'Ví dụ',
        topic: 'WORK' as CheerTopic,
        title: 'Cố lên!',
        lyrics: [],
        audioUrl: '',
        avatarUrl: '',
        createdAt: ''
      })
    };
  }
  return context;
};
