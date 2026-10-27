import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { RefreshCw, X, Loader2, CheckCircle2 } from 'lucide-react';
import { StepProgressBar } from '../ui/StepProgressBar';
import { validateRecipientName } from '../../utils/brandSafety';
import { detectFaceApi } from '../../utils/faceApi';

export const Frame6InfoUpload: React.FC = () => {
  const { formData, updateFormData, setStep } = useCheerCampaign();
  const [recipientName, setRecipientName] = useState(formData.recipientName || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(formData.avatarUrl || null);
  const [isFaceValid, setIsFaceValid] = useState<boolean>(!!formData.avatarUrl);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [faceNote, setFaceNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSourceModalOpen, setIsSourceModalOpen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDesktop = useIsDesktop();

  const processImageFile = async (file: File) => {
    setError('');
    setFaceNote('');
    setIsDetecting(true);

    try {
      // 1. Gọi API nhận diện khuôn mặt AI và chọn mặt to nhất
      const res = await detectFaceApi(file);

      if (res.success) {
        setIsFaceValid(true);
        setFaceNote(res.message || 'Đã phát hiện khuôn mặt hợp lệ.');

        if (res.previewUrl) {
          setAvatarUrl(res.previewUrl);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            setAvatarUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      } else {
        setIsFaceValid(false);
        setAvatarUrl(null);
        setError(res.error || 'Ảnh không phát hiện thấy khuôn mặt. Vui lòng chọn ảnh chụp rõ khuôn mặt!');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch {
      setError('Lỗi khi kiểm tra khuôn mặt. Vui lòng thử lại.');
      setIsFaceValid(false);
      setAvatarUrl(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const startCamera = async () => {
    setIsSourceModalOpen(false);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 720 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError('Không thể truy cập camera. Vui lòng cấp quyền camera trên trình duyệt!');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          stopCamera();
          await processImageFile(file);
        }
      }, 'image/jpeg', 0.95);
    }
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setIsFaceValid(false);
    setFaceNote('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e?: React.FormEvent | React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    
    // 1. Kiểm tra Tên người cần cổ vũ
    if (!recipientName.trim()) {
      setError('Vui lòng nhập tên người cần cổ vũ');
      return;
    }

    // 2. Kiểm duyệt Brand Safety
    const safetyCheck = validateRecipientName(recipientName);
    if (!safetyCheck.isValid) {
      setError(safetyCheck.errorMessage || 'Tên không hợp lệ');
      return;
    }

    // 3. Bắt buộc phải có ảnh khuôn mặt hợp lệ mới được tiếp tục
    if (!avatarUrl || !isFaceValid) {
      setError('Vui lòng tải lên ảnh chụp rõ khuôn mặt để tiếp tục!');
      return;
    }

    setError('');
    updateFormData({
      recipientName: recipientName.trim(),
      avatarUrl: avatarUrl
    });

    setStep('FRAME_7_TOPIC');
  };

  if (isDesktop) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="flex flex-col items-center justify-between w-full max-w-[540px] xl:max-w-[580px] h-full mx-auto pt-[4vh] lg:pt-[5vh] pb-3 lg:pb-4 text-center select-none z-10 relative"
      >
        <form onSubmit={handleSubmit} className="flex flex-col items-center justify-between flex-1 w-full h-full">
          {/* Progress Bar (Nằm sát trên cùng) với 2 nút Arrow căn 2 mép cột guideline */}
          <div className="w-full shrink-0 z-20">
            <StepProgressBar
              currentStepNumber={3}
              onPrev={() => setStep('FRAME_5_OTP')}
              onNext={() => handleSubmit()}
              isDesktop={true}
            />
          </div>

          {/* Cụm giữa: Nhập tên + Thả chiếc ảnh (Khoảng cách chuẩn xác 100% theo thiết kế) */}
          <div className="flex-1 flex flex-col items-center justify-center w-full my-auto py-1">
            {/* Cụm 1: Nhập tên người cần cổ vũ */}
            <div className="flex flex-col items-center justify-center text-center w-full">
              <div className="flex items-center justify-center mb-3 lg:mb-4">
                <img
                  src="/desktop-info-name-title.png"
                  alt="Nhập tên người cần cổ vũ"
                  className="h-10 lg:h-12 w-auto object-contain drop-shadow"
                />
              </div>

              <div className="relative w-full max-w-sm lg:max-w-md flex flex-col items-center justify-center pb-2">
                <input
                  type="text"
                  placeholder=""
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                    if (error) setError('');
                  }}
                  maxLength={8}
                  autoFocus
                  className="w-full bg-transparent text-center font-normal text-3xl lg:text-4xl xl:text-5xl text-[#FFDF00] outline-none px-4 relative z-10 py-1 tracking-wider drop-shadow"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                />
                <img
                  src="/desktop-info-underline-exact.png"
                  alt=""
                  className="w-full h-auto object-contain pointer-events-none drop-shadow absolute -bottom-1 left-0 right-0"
                />
              </div>
            </div>

            {/* Cụm 2: Thả chiếc ảnh có mặt bạn (Khoảng cách co giãn thông minh) */}
            <div className="flex flex-col items-center justify-center text-center w-full mt-4 lg:mt-6 xl:mt-8">
              <div className="flex items-center justify-center mb-2.5 lg:mb-3">
                <img
                  src="/desktop-info-photo-title.png"
                  alt="Thả chiếc ảnh có mặt bạn"
                  className="h-9 lg:h-11 w-auto object-contain drop-shadow"
                />
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {isDetecting ? (
                <div 
                  className="w-[300px] lg:w-[340px] h-24 flex flex-col items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[#002B12] border-2 border-[#28FF52] text-[#76FF03] shadow-lg shrink-0"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  <Loader2 className="w-7 h-7 animate-spin text-[#76FF03]" />
                  <span className="text-lg lg:text-xl font-normal tracking-wider uppercase">Đang nhận diện khuôn mặt bằng AI...</span>
                </div>
              ) : avatarUrl ? (
                <div className="relative flex flex-col items-center justify-center group my-1">
                  <div 
                    onClick={() => setIsSourceModalOpen(true)}
                    className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-2xl border-2 border-[#76FF03] overflow-hidden shadow-[0_0_20px_rgba(118,255,3,0.5)] cursor-pointer"
                  >
                    <img
                      src={avatarUrl}
                      alt="Ảnh đã chọn"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <RefreshCw className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  {faceNote && (
                    <div 
                      className="flex items-center gap-1.5 text-sm lg:text-base text-[#28FF52] font-normal mt-1.5 drop-shadow tracking-wider uppercase"
                      style={{ fontFamily: "'RoadRage', sans-serif" }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#28FF52]" />
                      <span>{faceNote}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSourceModalOpen(true)}
                    className="flex items-center gap-1 text-sm lg:text-base text-white/80 hover:text-[#FFDF00] mt-1 underline cursor-pointer tracking-wider uppercase transition-colors"
                    style={{ fontFamily: "'RoadRage', sans-serif" }}
                  >
                    <X className="w-3.5 h-3.5" /> Chọn ảnh khác
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsSourceModalOpen(true)}
                  className="cursor-pointer select-none py-1 hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-center"
                >
                  <img
                    src="/desktop-info-upload-icon-exact.png"
                    alt="Chọn ảnh có mặt bạn"
                    className="h-18 sm:h-20 lg:h-24 xl:h-26 w-auto object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
                  />
                </div>
              )}

              {error && (
                <div 
                  className="mt-3 px-4 py-1.5 rounded-lg bg-red-950/80 border border-red-500 text-base lg:text-lg font-normal text-red-300 text-center max-w-md tracking-wider uppercase"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button: TIẾP TỤC (Nằm sát dưới cùng, tràn đầy 2 mép guideline cột giữa) */}
          <div className="w-full flex items-center justify-center pb-2 pt-2 shrink-0">
            <button
              type="submit"
              disabled={isDetecting || !avatarUrl || !recipientName.trim()}
              className={`w-full flex items-center justify-center cursor-pointer select-none transition-transform border-0 bg-transparent ${
                isDetecting || !avatarUrl || !recipientName.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105 active:scale-95'
              }`}
            >
              <img
                src="/desktop-btn-tieptuc.png"
                alt="TIẾP TỤC"
                className="w-full h-auto object-contain max-h-13 lg:max-h-14 drop-shadow-2xl"
              />
            </button>
          </div>
        </form>

        {/* Modal Chọn Nguồn Ảnh (Action Sheet 2 options + Nút HUỶ - Đặt ở đáy page) */}
        {isSourceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-6 lg:pb-8 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setIsSourceModalOpen(false)} />

            <div className="relative z-10 w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px] flex flex-col items-center gap-3 select-none">
              {/* Option Container sử dụng chính xác ảnh nền Rectangle 4 copy.png */}
              <div className="relative w-full flex flex-col items-center justify-center">
                <img
                  src="/desktop-choice-box-bg.png"
                  alt=""
                  className="w-full h-auto object-contain pointer-events-none drop-shadow-2xl"
                />

                {/* Nội dung bên trong đè lên trên ảnh nền Rectangle 4 copy.png */}
                <div className="absolute inset-0 overflow-hidden rounded-[18px] sm:rounded-[22px] flex flex-col items-center justify-between py-2 sm:py-2.5">
                  {/* Option 1: Upload ảnh lên */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSourceModalOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full flex-1 flex items-center justify-start pl-4 sm:pl-5 lg:pl-6 gap-4 lg:gap-5 hover:opacity-90 active:scale-98 transition-all border-0 bg-transparent cursor-pointer group"
                  >
                    <div className="w-7 lg:w-8 flex items-center justify-center shrink-0">
                      <img
                        src="/desktop-icon-upload.png"
                        alt=""
                        className="h-6 lg:h-7 w-auto object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <img
                      src="/desktop-text-upload-anh-len.png"
                      alt="Upload ảnh lên"
                      className="h-6 lg:h-7 w-auto object-contain group-hover:scale-105 transition-transform"
                    />
                  </button>

                  {/* Divider Line Layer 13.png (Giảm chiều dài thêm 1px nữa) */}
                  <div className="w-full flex items-center justify-center relative -translate-x-[1px] pr-[2px]">
                    <img
                      src="/desktop-choice-divider.png"
                      alt=""
                      className="w-full h-[2px] object-fill opacity-90"
                    />
                  </div>

                  {/* Option 2: Camera */}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="w-full flex-1 flex items-center justify-start pl-4 sm:pl-5 lg:pl-6 gap-4 lg:gap-5 hover:opacity-90 active:scale-98 transition-all border-0 bg-transparent cursor-pointer group"
                  >
                    <div className="w-7 lg:w-8 flex items-center justify-center shrink-0">
                      <img
                        src="/desktop-icon-camera.png"
                        alt=""
                        className="h-[25px] w-auto object-contain group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <img
                      src="/desktop-text-camera.png"
                      alt="Camera"
                      className="h-5 lg:h-6 w-auto object-contain group-hover:scale-105 transition-transform"
                    />
                  </button>
                </div>
              </div>

              {/* Button HUỶ (Sử dụng Button - Hủy.png với cùng chiều rộng) */}
              <button
                type="button"
                onClick={() => setIsSourceModalOpen(false)}
                className="w-full hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent cursor-pointer flex items-center justify-center"
              >
                <img
                  src="/desktop-btn-huy.png"
                  alt="HUỶ"
                  className="w-full h-auto object-contain drop-shadow-2xl"
                />
              </button>
            </div>
          </div>
        )}

        {/* Modal Camera Live Capture */}
        {isCameraActive && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-md bg-[#002B12] border-2 border-[#28FF52] rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
              <div className="w-full flex items-center justify-between">
                <span
                  className="text-2xl font-normal text-[#76FF03] tracking-wider uppercase"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  Chụp ảnh chân dung
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border-0 bg-transparent"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden border-2 border-[#28FF52] bg-black shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Oval Face Guide Overlay */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#76FF03]/60 rounded-full m-8" />
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-6 py-2.5 rounded-xl border border-white/30 text-white font-normal text-xl uppercase hover:bg-white/10 cursor-pointer"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#28FF52] to-[#00E65B] text-[#002B12] font-normal text-2xl uppercase tracking-wider hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(40,255,82,0.5)] cursor-pointer"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  Chụp ảnh
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Mobile View (< 768px)
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full flex-1 flex flex-col justify-start px-3 xs:px-4 py-2 pb-8"
    >
      <form onSubmit={handleSubmit} className="w-full flex flex-col flex-1 justify-between">
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
          {/* 4-Step Progress Bar với 2 nút Arrow - Trải rộng full width sang 2 mép biên */}
          <div className="w-full py-1 mt-1 xs:mt-2 mb-4 xs:mb-6">
            <StepProgressBar
              currentStepNumber={3}
              onPrev={() => setStep('FRAME_5_OTP')}
              onNext={() => handleSubmit()}
              isDesktop={false}
            />
          </div>

          {/* Cụm 1: Nhập tên người cần cổ vũ */}
          <div className="flex flex-col items-center justify-center text-center w-full my-2">
            <img
              src="/info-name-title.png"
              alt="Nhập tên người cần cổ vũ"
              className="h-auto max-h-10 sm:max-h-11 w-auto object-contain drop-shadow mb-3"
            />

            <div className="relative w-full max-w-[280px] flex flex-col items-center justify-center pt-2 pb-3 mb-1">
              <input
                type="text"
                placeholder=""
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (error) setError('');
                }}
                maxLength={8}
                autoFocus
                className="w-full bg-transparent text-center font-normal text-2xl sm:text-3xl text-[#FFDF00] outline-none px-4 relative z-10 py-2 tracking-wider drop-shadow"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              />
              <img
                src="/info-input-underline.png"
                alt=""
                className="w-full h-1.5 object-cover pointer-events-none drop-shadow absolute bottom-0 left-0 right-0"
              />
            </div>
          </div>

          {/* Cụm 2: Thả chiếc ảnh có mặt bạn */}
          <div className="flex flex-col items-center justify-center text-center mt-4 sm:mt-6 w-full">
            <img
              src="/info-photo-title.png"
              alt="Thả chiếc ảnh có mặt bạn"
              className="h-auto max-h-10 sm:max-h-11 w-auto object-contain drop-shadow mb-4"
            />

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {isDetecting ? (
              <div 
                className="w-[280px] sm:w-[300px] h-24 flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#002B12] border-2 border-[#28FF52] text-[#76FF03] shadow-md shrink-0"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                <Loader2 className="w-6 h-6 animate-spin text-[#76FF03]" />
                <span className="text-lg sm:text-xl font-normal tracking-wider uppercase">Đang nhận diện khuôn mặt bằng AI...</span>
              </div>
            ) : avatarUrl ? (
              <div className="relative flex flex-col items-center justify-center group my-1">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-[#76FF03] overflow-hidden shadow-[0_0_15px_rgba(118,255,3,0.4)] cursor-pointer"
                >
                  <img
                    src={avatarUrl}
                    alt="Ảnh đã chọn"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <RefreshCw className="w-6 h-6 text-white" />
                  </div>
                </div>
                {faceNote && (
                  <div 
                    className="flex items-center gap-1 text-sm sm:text-base text-[#28FF52] font-normal mt-1.5 drop-shadow tracking-wider uppercase"
                    style={{ fontFamily: "'RoadRage', sans-serif" }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#28FF52]" />
                    <span>{faceNote}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="flex items-center gap-1 text-sm sm:text-base text-white/80 hover:text-[#FFDF00] mt-1.5 underline cursor-pointer tracking-wider uppercase transition-colors"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                >
                  <X className="w-3 h-3" /> Chọn ảnh khác
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer select-none py-1 hover:scale-105 active:scale-95 transition-transform flex flex-col items-center justify-center"
              >
                <img
                  src="/info-upload-icon.png"
                  alt="Chọn ảnh có mặt bạn"
                  className="h-20 sm:h-24 w-auto object-contain drop-shadow-xl"
                />
              </div>
            )}

            {error && (
              <div 
                className="mt-3 px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-500 text-sm sm:text-base font-normal text-red-300 text-center max-w-[280px] tracking-wider uppercase"
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isDetecting || !avatarUrl || !recipientName.trim()}
          className={`w-full flex items-center justify-center cursor-pointer select-none py-1 mt-6 sm:mt-8 mb-2 transition-transform border-0 bg-transparent ${
            isDetecting || !avatarUrl || !recipientName.trim()
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:scale-105 active:scale-95'
          }`}
        >
          <img
            src="/info-submit-btn.png"
            alt="Tiếp tục"
            className="h-14 sm:h-16 w-auto object-contain drop-shadow-xl"
          />
        </button>
      </form>
    </motion.div>
  );
};
