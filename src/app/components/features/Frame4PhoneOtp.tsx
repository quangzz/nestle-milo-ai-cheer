import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useCheerCampaign } from '../../context/CheerCampaignContext';
import { useIsDesktop } from '../../hooks/useIsDesktop';
import { sendOtpApi, verifyOtpApi, checkPhoneVerifiedApi, markPhoneVerifiedLocal } from '../../utils/otpApi';
import { Loader2 } from 'lucide-react';
import { StepProgressBar } from '../ui/StepProgressBar';

const OTP_LENGTH = 6;

const normalizePhone = (input: string) => {
  if (!input) return '';
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  }
  return digits.slice(0, 10);
};

const isValidVietnamesePhone = (phone: string) => {
  return /^0(3|5|7|8|9)\d{8}$/.test(phone);
};

export const Frame4PhoneOtp: React.FC = () => {
  const { formData, updateFormData, setStep, currentStep } = useCheerCampaign();
  const isOtpStep = currentStep === 'FRAME_5_OTP';
  const isDesktop = useIsDesktop();

  const [phone, setPhone] = useState(formData.phone || '');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [phoneError, setPhoneError] = useState<string>('');
  const [otpError, setOtpError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(90);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const [isOtpFocused, setIsOtpFocused] = useState<boolean>(false);

  // Khóa cứng chống gọi verify OTP 2 lần song song
  const isVerifyingRef = useRef<boolean>(false);
  const otpInputDesktopRef = useRef<HTMLInputElement>(null);
  const otpInputMobileRef = useRef<HTMLInputElement>(null);

  const focusOtpInput = () => {
    requestAnimationFrame(() => {
      if (isDesktop) {
        otpInputDesktopRef.current?.focus();
      } else {
        otpInputMobileRef.current?.focus();
      }
    });
  };

  // Tự động focus vào ô OTP khi chuyển sang bước FRAME_5_OTP
  useEffect(() => {
    if (isOtpStep) {
      focusOtpInput();
    }
  }, [isOtpStep, isDesktop]);

  // Đồng bộ số điện thoại khi formData.phone thay đổi
  useEffect(() => {
    if (formData.phone && !phone) {
      setPhone(formData.phone);
    }
  }, [formData.phone]);

  // Countdown timer logic
  useEffect(() => {
    let timer: any;
    if (isCounting && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setIsCounting(false);
    }
    return () => clearTimeout(timer);
  }, [isCounting, countdown]);

  // Gửi OTP cho số điện thoại (Tự động nhận diện nếu đã từng chơi/xác thực)
  const handleSendOtp = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      setPhoneError('Vui lòng nhập số điện thoại');
      return;
    }
    if (cleanPhone.length < 10) {
      setPhoneError('Số điện thoại phải bao gồm đủ 10 chữ số');
      return;
    }
    if (!isValidVietnamesePhone(cleanPhone)) {
      setPhoneError('Số điện thoại không hợp lệ (Ví dụ: 0912345678, 03xxxxxxxx)');
      return;
    }

    setPhoneError('');
    setIsLoading(true);

    try {
      // 1. Kiểm tra xem số điện thoại này đã từng xác thực OTP thành công chưa
      const alreadyVerified = await checkPhoneVerifiedApi(cleanPhone);
      if (alreadyVerified) {
        // Đã từng xác thực -> Cho phép vào thẳng bước tiếp theo không cần nhập lại OTP
        updateFormData({ phone: cleanPhone, otp: 'VERIFIED_PREVIOUSLY' });
        setStep('FRAME_6_INFO');
        return;
      }

      // 2. Chưa từng xác thực -> Gửi mã OTP qua SMS / Zalo
      const res = await sendOtpApi(cleanPhone);
      if (res.success) {
        if (res.alreadyVerified) {
          updateFormData({ phone: cleanPhone, otp: 'VERIFIED_PREVIOUSLY' });
          setStep('FRAME_6_INFO');
          return;
        }
        updateFormData({ phone: cleanPhone, otp: '' });
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setStep('FRAME_5_OTP');
        setCountdown(90);
        setIsCounting(true);
        setTimeout(focusOtpInput, 100);
      } else {
        setPhoneError(res.error || 'Gửi mã OTP thất bại. Vui lòng thử lại.');
      }
    } catch {
      setPhoneError('Lỗi kết nối. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Gửi lại mã OTP (Luôn lấy số điện thoại mới nhất)
  const handleResendOtp = async () => {
    if (isLoading) return;
    const targetPhone = (phone || formData.phone || '').trim();
    if (!targetPhone) {
      setOtpError('Vui lòng quay lại nhập số điện thoại.');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    try {
      const res = await sendOtpApi(targetPhone);
      if (res.success) {
        if (res.alreadyVerified) {
          updateFormData({ phone: targetPhone, otp: 'VERIFIED_PREVIOUSLY' });
          setStep('FRAME_6_INFO');
          return;
        }
        setCountdown(90);
        setIsCounting(true);
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setTimeout(focusOtpInput, 100);
      } else {
        setOtpError(res.error || 'Không thể gửi lại mã OTP.');
      }
    } catch {
      setOtpError('Lỗi kết nối khi gửi lại OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quay lại bước nhập số điện thoại để sửa số mới
  const handleBackToPhoneStep = () => {
    setPhoneError('');
    setOtpError('');
    setOtp(['', '', '', '', '', '']);
    setIsOtpFocused(false);
    isVerifyingRef.current = false;
    setStep('FRAME_4_PHONE');
  };

  const otpValue = otp.join('');

  // 1 ô nhập duy nhất phủ lên 6 ô hiển thị: gõ liền 6 số, dán hoặc điện thoại tự điền mã; đủ 6 số thì tự xác nhận
  const applyOtpValue = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] || ''));
    if (otpError) setOtpError('');
    if (digits.length === OTP_LENGTH) {
      (document.activeElement as HTMLElement | null)?.blur();
      verifyOtpCode(digits);
    }
  };

  // Dán cả nội dung tin nhắn (vd: "Ma OTP MILO cua ban la: 123456") vẫn lấy đúng mã 6 số
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const code = text.match(/(?<!\d)\d{6}(?!\d)/)?.[0] ?? text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!code) return;
    e.preventDefault();
    applyOtpValue(code);
  };

  // Android Chrome: tự đọc mã từ SMS (WebOTP API). Chỉ hoạt động khi tin nhắn SMS
  // kết thúc bằng dòng "@<domain> #<mã>" và trang chạy HTTPS
  useEffect(() => {
    if (!isOtpStep || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((cred) => {
        const code = (cred as (Credential & { code?: string }) | null)?.code?.replace(/\D/g, '');
        if (code) applyOtpValue(code);
      })
      .catch(() => {});
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOtpStep]);

  const handleVerifyOtp = (e?: React.FormEvent | React.MouseEvent) => {
    if (e?.preventDefault) e.preventDefault();
    verifyOtpCode(otp.join(''));
  };

  const verifyOtpCode = async (fullOtp: string) => {
    // Khóa cứng chống gọi xác thực 2 lần khi gõ đủ 6 số và click nút cùng lúc
    if (isVerifyingRef.current || isLoading) return;
    const targetPhone = (phone || formData.phone || '').trim();
    if (fullOtp.length < OTP_LENGTH) {
      setOtpError('Vui lòng nhập đủ 6 chữ số OTP');
      return;
    }

    isVerifyingRef.current = true;
    setOtpError('');
    setIsLoading(true);

    try {
      const res = await verifyOtpApi(targetPhone, fullOtp);
      if (res.success) {
        // Lưu lại số điện thoại đã xác thực thành công
        markPhoneVerifiedLocal(targetPhone);
        updateFormData({ phone: targetPhone, otp: fullOtp });
        setStep('FRAME_6_INFO');
      } else {
        setOtpError(res.error || 'Mã OTP không chính xác.');
        // Sai mã thì xóa trắng 6 ô và focus lại ngay để người dùng gõ lại mà không cần chạm thêm
        setOtp(['', '', '', '', '', '']);
        focusOtpInput();
      }
    } catch {
      setOtpError('Lỗi kết nối khi xác thực OTP.');
      setOtp(['', '', '', '', '', '']);
      focusOtpInput();
    } finally {
      isVerifyingRef.current = false;
      setIsLoading(false);
    }
  };

  // DESKTOP VIEW: Bố cục hoàn hảo với logic progress bar đồng bộ
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
            currentStepNumber={isOtpStep ? 2 : 1}
            onPrev={() => {
              if (isOtpStep) {
                handleBackToPhoneStep();
              } else {
                setStep('FRAME_3_TNC');
              }
            }}
            onNext={() => {
              if (isOtpStep) {
                handleVerifyOtp();
              } else {
                handleSendOtp();
              }
            }}
            isLoading={isLoading}
            isDesktop={true}
          />
        </div>

        <AnimatePresence mode="wait">
          {!isOtpStep ? (
            /* Desktop Screen: Nhập SĐT */
            <motion.form
              key="desktop-phone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSendOtp}
              className="flex-1 flex flex-col items-center justify-between w-full h-full py-2"
            >
              {/* Cụm giữa: Tiêu đề + Input (Font RoadRage) */}
              <div className="flex flex-col items-center justify-center my-auto w-full">
                <div className="flex items-center justify-center mb-3">
                  <img
                    src="/desktop-phone-title-group33.png"
                    alt="Nhập số điện thoại"
                    className="h-13 lg:h-15 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform"
                  />
                </div>

                <div className="relative w-full max-w-sm flex flex-col items-center justify-center pt-2 pb-3 mb-2">
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={phone}
                    onChange={(e) => {
                      const cleanPhone = normalizePhone(e.target.value);
                      setPhone(cleanPhone);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder=""
                    maxLength={10}
                    autoFocus
                    className="w-full bg-transparent text-center font-normal text-4xl lg:text-5xl text-[#FFDF00] outline-none px-6 relative z-10 py-1 tracking-widest drop-shadow"
                    style={{ fontFamily: "'RoadRage', sans-serif" }}
                  />
                  <img
                    src="/desktop-phone-input-line.png"
                    alt=""
                    className="w-full h-auto object-contain pointer-events-none drop-shadow absolute bottom-0 left-0 right-0"
                  />
                </div>

                {phoneError && (
                  <span className="text-sm font-semibold text-red-400 text-center mb-2">
                    {phoneError}
                  </span>
                )}
              </div>

              {/* Nút Tiếp tục: Đẩy xuống dưới cùng trang, tràn đầy 2 mép guideline */}
              <div className="w-full flex items-center justify-center pb-2 pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div 
                      className="flex items-center justify-center gap-2.5 py-3 px-8 rounded-2xl bg-[#002B12] border-2 border-[#28FF52] text-[#76FF03] text-2xl tracking-wider uppercase shadow-lg"
                      style={{ fontFamily: "'RoadRage', sans-serif" }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-[#76FF03]" />
                      <span>Đang gửi mã OTP...</span>
                    </div>
                  ) : (
                    <img
                      src="/desktop-phone-btn-tieptuc.png"
                      alt="Tiếp tục"
                      className="w-full h-auto object-contain max-h-13 lg:max-h-14 drop-shadow-2xl"
                    />
                  )}
                </button>
              </div>
            </motion.form>
          ) : (
            /* Desktop Screen: Nhập OTP - Cụm OTP ở giữa, Nút Xác nhận ở dưới cùng */
            <motion.form
              key="desktop-otp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleVerifyOtp}
              className="flex-1 flex flex-col items-center justify-between w-full h-full py-2"
            >
              {/* Cụm giữa: Tiêu đề + 6 ô vuông + Đếm ngược + Đổi SĐT */}
              <div className="flex flex-col items-center justify-center my-auto w-full">
                {/* Tiêu đề Nhập mã OTP (Nằm sát ngay trên 6 ô vuông) */}
                <div className="flex items-center justify-center mb-5">
                  <img
                    src="/desktop-otp-title-group33.png"
                    alt="Nhập mã OTP"
                    className="h-14 lg:h-16 w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform"
                  />
                </div>

                {/* 6 OTP Boxes giữ nguyên 100% ảnh design Group 34.png + thêm hiệu ứng shadow nổi bật */}
                <div
                  onClick={focusOtpInput}
                  className="relative w-[380px] lg:w-[460px] max-w-[92vw] mx-auto my-3 select-none flex items-center justify-center cursor-text"
                >
                  <img
                    src="/desktop-otp-group34.png"
                    alt="Khung nhập OTP"
                    className="w-full h-auto object-contain pointer-events-none drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
                  />
                  <div className="absolute inset-0 grid grid-cols-6 items-center px-1 pointer-events-none">
                    {otp.map((digit, index) => {
                      const isNextInput = isOtpFocused && index === otpValue.length && otpValue.length < OTP_LENGTH;
                      return (
                        <div
                          key={index}
                          className="relative w-full h-full flex items-center justify-center"
                        >
                          <span
                            className="w-full h-full bg-transparent text-center text-4xl lg:text-5xl font-normal text-[#003816] outline-none tracking-normal drop-shadow-sm flex items-center justify-center"
                            style={{ fontFamily: "'RoadRage', sans-serif" }}
                          >
                            {digit}
                          </span>
                          {/* Đánh dấu ô kế tiếp cần nhập khi input đang focus (nhấp nháy nhẹ) */}
                          {isNextInput && (
                            <span
                              className="absolute bottom-2.5 lg:bottom-3 w-5 lg:w-7 h-[3px] bg-[#003816] rounded-full animate-pulse shadow-sm"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <input
                    ref={otpInputDesktopRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={OTP_LENGTH}
                    value={otpValue}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    onChange={(e) => applyOtpValue(e.target.value)}
                    onPaste={handleOtpPaste}
                    aria-label="Mã OTP"
                    className="absolute inset-0 w-full h-full bg-transparent text-transparent outline-none border-0 cursor-text selection:bg-transparent opacity-0 z-10"
                    style={{ caretColor: 'transparent', fontSize: 16 }}
                  />
                </div>

                {otpError && (
                  <span className="text-sm lg:text-base font-semibold text-red-400 my-1">
                    {otpError}
                  </span>
                )}

                {/* Countdown & Đổi SĐT Section */}
                <div className="flex flex-col items-center gap-2 text-white my-3">
                  {isCounting && countdown > 0 ? (
                    <span
                      className="text-lg lg:text-xl font-normal text-white tracking-wider uppercase drop-shadow select-none cursor-default"
                      style={{ fontFamily: "'RoadRage', sans-serif" }}
                    >
                      Gửi lại mã sau {countdown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleResendOtp}
                      className={`text-lg lg:text-xl font-normal text-[#76FF03] hover:text-[#FFDF00] tracking-wider uppercase drop-shadow select-none cursor-pointer transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ fontFamily: "'RoadRage', sans-serif" }}
                    >
                      {isLoading ? 'Đang gửi lại...' : 'Gửi lại mã ngay'}
                    </button>
                  )}
                  
                  {/* Nút Đổi số điện thoại */}
                  <button
                    type="button"
                    onClick={handleBackToPhoneStep}
                    className="flex items-center justify-center hover:scale-105 active:scale-95 hover:opacity-90 transition-all select-none cursor-pointer mt-1 py-1"
                  >
                    <img
                      src="/desktop-otp-change-phone.png"
                      alt="Đổi (sửa) số điện thoại"
                      className="h-6 lg:h-7 w-auto object-contain drop-shadow"
                    />
                  </button>
                </div>
              </div>

              {/* Nút Xác nhận: Đẩy xuống gần cuối trang, tràn đầy 2 mép guideline */}
              <div className="w-full flex items-center justify-center pb-2 pt-2 shrink-0">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center cursor-pointer select-none hover:scale-105 active:scale-95 transition-transform border-0 bg-transparent ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div 
                      className="flex items-center justify-center gap-2.5 py-3 px-8 rounded-2xl bg-[#002B12] border-2 border-[#28FF52] text-[#76FF03] text-2xl tracking-wider uppercase shadow-lg"
                      style={{ fontFamily: "'RoadRage', sans-serif" }}
                    >
                      <Loader2 className="w-6 h-6 animate-spin text-[#76FF03]" />
                      <span>Đang xác thực OTP...</span>
                    </div>
                  ) : (
                    <img
                      src="/desktop-btn-xacnhan-exact.png"
                      alt="Xác nhận"
                      className="w-full h-auto object-contain max-h-13 lg:max-h-14 drop-shadow-2xl"
                    />
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // MOBILE VIEW (< 768px)
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full h-full flex-1 min-h-0 flex flex-col justify-between items-center px-3 xs:px-4 py-2 pb-4 select-none relative"
    >
      {/* Progress Bar (Sáng theo từng bước) với 2 nút Arrow ở trên cùng */}
      <div className="w-full py-1 mt-1 mb-2 shrink-0">
        <StepProgressBar
          currentStepNumber={isOtpStep ? 2 : 1}
          onPrev={() => {
            if (isOtpStep) {
              handleBackToPhoneStep();
            } else {
              setStep('FRAME_3_TNC');
            }
          }}
          onNext={() => {
            if (isOtpStep) {
              handleVerifyOtp();
            } else {
              handleSendOtp();
            }
          }}
          isLoading={isLoading}
          isDesktop={false}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isOtpStep ? (
          /* Mobile Form: Nhập SĐT - Cụm nhập ở giữa trang, nút Tiếp tục ở cuối trang */
          <motion.form
            key="phone-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSendOtp}
            className="flex-1 w-full flex flex-col justify-between items-center my-auto py-2"
          >
            {/* CỤM NHẬP ĐIỆN THOẠI Ở GIỮA TRANG (my-auto) */}
            <div className="flex-1 flex flex-col items-center justify-center my-auto w-full max-w-[320px] pt-6 sm:pt-8">
              {/* Tiêu đề Nhập số điện thoại (Vệt vàng) */}
              <div className="flex items-center justify-center text-center mb-6 w-full">
                <img
                  src="/desktop-phone-title-group33.png"
                  alt="Nhập số điện thoại"
                  className="h-12 sm:h-14 w-auto object-contain drop-shadow"
                />
              </div>

              {/* Input Số điện thoại và đường kẻ ngang xanh */}
              <div className="relative w-full flex flex-col items-center justify-center pt-2 pb-3 mb-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={phone}
                  onChange={(e) => {
                    const cleanPhone = normalizePhone(e.target.value);
                    setPhone(cleanPhone);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder=""
                  maxLength={10}
                  autoFocus
                  className="w-full bg-transparent text-center font-normal text-4xl sm:text-5xl text-[#FFDF00] outline-none px-6 relative z-10 py-1 tracking-widest drop-shadow"
                  style={{ fontFamily: "'RoadRage', sans-serif" }}
                />
                <img
                  src="/desktop-phone-input-line.png"
                  alt=""
                  className="w-full h-auto object-contain pointer-events-none drop-shadow absolute bottom-0 left-0 right-0"
                />
              </div>

              {phoneError && (
                <span className="text-sm font-semibold text-red-400 text-center mt-2">
                  {phoneError}
                </span>
              )}
            </div>

            {/* NÚT TIẾP TỤC Ở CUỐI TRANG (mt-auto) */}
            <div className="w-full flex items-center justify-center shrink-0 pt-4 pb-1 mt-auto">
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center justify-center cursor-pointer select-none transition-all border-0 bg-transparent ${
                  isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-3 px-8 rounded-2xl bg-[#002B12] border-2 border-[#28FF52] text-[#76FF03] text-xl font-bold tracking-wider uppercase shadow-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-[#76FF03]" />
                    <span>Đang gửi mã...</span>
                  </div>
                ) : (
                  <img
                    src="/mobile-btn-tieptuc.png"
                    alt="TIẾP TỤC"
                    className="h-12 sm:h-14 w-auto object-contain drop-shadow-xl"
                  />
                )}
              </button>
            </div>
          </motion.form>
        ) : (
          /* Mobile Form: Nhập OTP - Cụm OTP ở giữa trang, nút Xác nhận ở cuối trang */
          <motion.form
            key="otp-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleVerifyOtp}
            className="flex-1 w-full flex flex-col justify-between items-center my-auto py-2 text-center"
          >
            {/* CỤM NHẬP MÃ OTP Ở GIỮA TRANG (my-auto) */}
            <div className="flex-1 flex flex-col items-center justify-center my-auto w-full pt-4">
              <div className="flex items-center justify-center text-center mb-4 w-full">
                <img
                  src="/desktop-otp-title-group33.png"
                  alt="Nhập mã OTP"
                  className="h-12 sm:h-14 w-auto object-contain drop-shadow-xl"
                />
              </div>

              {/* 6 OTP Boxes Mobile giữ nguyên 100% ảnh design Group 34.png + thêm hiệu ứng shadow */}
              <div
                onClick={focusOtpInput}
                className="relative w-[320px] sm:w-[360px] max-w-[92vw] mx-auto my-3 select-none flex items-center justify-center cursor-text"
              >
                <img
                  src="/desktop-otp-group34.png"
                  alt="Khung nhập OTP"
                  className="w-full h-auto object-contain pointer-events-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.85)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                />
                <div className="absolute inset-0 grid grid-cols-6 items-center px-1 pointer-events-none">
                  {otp.map((digit, index) => {
                    const isNextInput = isOtpFocused && index === otpValue.length && otpValue.length < OTP_LENGTH;
                    return (
                      <div
                        key={index}
                        className="relative w-full h-full flex items-center justify-center"
                      >
                        <span
                          className="w-full h-full bg-transparent text-center text-3xl sm:text-4xl font-normal text-[#003816] outline-none tracking-normal drop-shadow-sm flex items-center justify-center"
                          style={{ fontFamily: "'RoadRage', sans-serif" }}
                        >
                          {digit}
                        </span>
                        {/* Đánh dấu ô kế tiếp cần nhập khi input đang focus (nhấp nháy nhẹ) */}
                        {isNextInput && (
                          <span
                            className="absolute bottom-2 sm:bottom-2.5 w-4 sm:w-5 h-[2.5px] bg-[#003816] rounded-full animate-pulse shadow-sm"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <input
                  ref={otpInputMobileRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={OTP_LENGTH}
                  value={otpValue}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  onChange={(e) => applyOtpValue(e.target.value)}
                  onPaste={handleOtpPaste}
                  aria-label="Mã OTP"
                  className="absolute inset-0 w-full h-full bg-transparent text-transparent outline-none border-0 cursor-text selection:bg-transparent opacity-0 z-10"
                  style={{ caretColor: 'transparent', fontSize: 16 }}
                />
              </div>

              {otpError && (
                <span className="text-xs font-semibold text-red-400 my-1">
                  {otpError}
                </span>
              )}

              <div className="flex flex-col items-center gap-2 text-xs text-white my-3">
                {isCounting && countdown > 0 ? (
                  <span
                    className="text-base sm:text-lg font-normal text-white tracking-wider uppercase drop-shadow select-none cursor-default"
                    style={{ fontFamily: "'RoadRage', sans-serif" }}
                  >
                    Gửi lại mã sau {countdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={handleResendOtp}
                    className={`text-base sm:text-lg font-normal text-[#76FF03] hover:text-[#FFDF00] tracking-wider uppercase drop-shadow select-none cursor-pointer transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ fontFamily: "'RoadRage', sans-serif" }}
                  >
                    {isLoading ? 'Đang gửi lại...' : 'Gửi lại mã ngay'}
                  </button>
                )}
                
                {/* Nút Đổi số điện thoại */}
                <button
                  type="button"
                  onClick={handleBackToPhoneStep}
                  className="flex items-center justify-center hover:scale-105 active:scale-95 hover:opacity-90 transition-all select-none cursor-pointer mt-1 py-1"
                >
                  <img
                    src="/desktop-otp-change-phone.png"
                    alt="Đổi (sửa) số điện thoại"
                    className="h-[18px] sm:h-[20px] w-auto object-contain drop-shadow hover:brightness-110"
                  />
                </button>
              </div>
            </div>

            {/* NÚT XÁC NHẬN Ở CUỐI TRANG (mt-auto) */}
            <div className="w-full flex items-center justify-center shrink-0 pt-4 pb-1 mt-auto">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full max-w-[280px] sm:max-w-[310px] py-2.5 sm:py-3 rounded-2xl text-white text-2xl sm:text-3xl font-bold tracking-wider uppercase transition-all shadow-xl border-0 ${
                  isLoading 
                    ? 'bg-[#00A651]/40 cursor-not-allowed opacity-60' 
                    : 'bg-[#00A651] hover:bg-[#00B859] active:scale-95 cursor-pointer shadow-[0_0_20px_rgba(0,166,81,0.6)]'
                }`}
                style={{ fontFamily: "'RoadRage', sans-serif" }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                    <span>Đang xác thực...</span>
                  </div>
                ) : (
                  'XÁC NHẬN'
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
