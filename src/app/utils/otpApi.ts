/**
 * Quản lý API Gửi & Xác thực OTP qua Backend Server Local
 * Toàn bộ tài khoản, mật khẩu và API Abenla SMS được bảo mật 100% tại máy chủ backend
 */

export const getBackendEndpoints = (): string[] => {
  const endpoints: string[] = [];

  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.')
  );

  // 1. Môi trường phát triển cục bộ: ưu tiên kết nối backend local trước khi đang ở máy dev
  if (isLocal) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      endpoints.push('http://localhost:5005', 'http://localhost:5000');
    } else {
      endpoints.push(`http://${window.location.hostname}:5005`, `http://${window.location.hostname}:5000`);
    }
  }

  // 2. Biến môi trường VITE_BACKEND_URL nếu có
  if (import.meta.env.VITE_BACKEND_URL) {
    endpoints.push(import.meta.env.VITE_BACKEND_URL);
  }

  // 3. Đường hầm Cloudflare Tunnel HTTPS chính thức phục vụ production & staging live
  endpoints.push('https://136-85-20-35.sslip.io', 'https://device-lead-code-silicon.trycloudflare.com');

  // 4. IP Server backend dự phòng
  endpoints.push('http://136.85.20.35');

  // 5. Origin hiện tại của trang web (nếu có proxy reverse)
  if (typeof window !== 'undefined' && window.location.origin) {
    endpoints.push(window.location.origin);
  }

  return endpoints.filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);
};

export function getSavedVerificationToken(): string | null {
  try {
    return sessionStorage.getItem('milo_verification_token') || localStorage.getItem('milo_verification_token') || null;
  } catch {
    return null;
  }
}

export function saveVerificationToken(token: string) {
  try {
    sessionStorage.setItem('milo_verification_token', token);
    localStorage.setItem('milo_verification_token', token);
  } catch {}
}

/**
 * Gửi yêu cầu sinh và gửi mã OTP qua SMS Abenla
 */
export async function sendOtpApi(phoneNumber: string): Promise<{ success: boolean; alreadyVerified?: boolean; error?: string; message?: string }> {
  const endpoints = getBackendEndpoints();
  console.log('[DEBUG][otpApi] sendOtpApi: Danh sách endpoints:', endpoints);

  for (const baseUrl of endpoints) {
    try {
      console.log(`[DEBUG][otpApi] sendOtpApi: Đang thử kết nối ${baseUrl}/api/send-otp...`);
      const response = await fetch(`${baseUrl}/api/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[DEBUG][otpApi] ${baseUrl} trả về non-JSON content-type: ${contentType}, bỏ qua.`);
        continue;
      }

      if (response.ok) {
        const data = await response.json();
        console.log(`[DEBUG][otpApi] sendOtpApi thành công qua ${baseUrl}:`, data);
        if (data.verificationToken) {
          saveVerificationToken(data.verificationToken);
        }
        if (data.alreadyVerified) {
          markPhoneVerifiedLocal(phoneNumber);
        }
        return {
          success: true,
          alreadyVerified: Boolean(data.alreadyVerified),
          message: data.message || 'Mã OTP đã được gửi.'
        };
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn(`[DEBUG][otpApi] ${baseUrl} trả về mã lỗi ${response.status}:`, errData);
        return {
          success: false,
          error: errData.error || 'Không thể gửi mã OTP. Vui lòng thử lại.'
        };
      }
    } catch (err) {
      console.warn(`[DEBUG][otpApi] Lỗi khi gọi ${baseUrl}/api/send-otp:`, err);
    }
  }

  return {
    success: false,
    error: 'Không thể kết nối tới máy chủ backend. Vui lòng kiểm tra kết nối mạng.'
  };
}

/**
 * Xác thực mã OTP người dùng nhập qua Backend Server
 */
export async function verifyOtpApi(phoneNumber: string, otp: string): Promise<{ success: boolean; error?: string; verificationToken?: string }> {
  const endpoints = getBackendEndpoints();
  console.log('[DEBUG][otpApi] verifyOtpApi: Danh sách endpoints:', endpoints);

  for (const baseUrl of endpoints) {
    try {
      console.log(`[DEBUG][otpApi] verifyOtpApi: Đang thử kết nối ${baseUrl}/api/verify-otp...`);
      const response = await fetch(`${baseUrl}/api/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, otp })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[DEBUG][otpApi] ${baseUrl} trả về non-JSON content-type: ${contentType}, bỏ qua.`);
        continue;
      }

      const data = await response.json();
      if (response.ok && data.success) {
        console.log(`[DEBUG][otpApi] verifyOtpApi thành công qua ${baseUrl}:`, data);
        if (data.verificationToken) {
          saveVerificationToken(data.verificationToken);
        }
        return { success: true, verificationToken: data.verificationToken };
      } else {
        console.warn(`[DEBUG][otpApi] verifyOtpApi thất bại từ ${baseUrl}:`, data);
        return {
          success: false,
          error: data.error || 'Mã OTP không chính xác hoặc đã hết hạn.'
        };
      }
    } catch (err) {
      console.warn(`[DEBUG][otpApi] Lỗi khi gọi ${baseUrl}/api/verify-otp:`, err);
    }
  }

  return {
    success: false,
    error: 'Không thể kết nối máy chủ để xác thực OTP.'
  };
}

// Danh sách các số điện thoại dùng để kiểm thử luồng OTP (luôn luôn bắt buộc nhập OTP, tự xóa sạch cache local)
const ALWAYS_REQUIRE_OTP_PHONES = ['0963253930', '0986653614'];

/**
 * Kiểm tra xem số điện thoại đã từng xác thực OTP thành công trước đó chưa
 */
export async function checkPhoneVerifiedApi(phoneNumber: string): Promise<boolean> {
  const cleanPhone = phoneNumber.trim();
  if (!cleanPhone) return false;

  // Nếu là số điện thoại kiểm thử: xóa sạch cache local và luôn bắt buộc nhập OTP
  if (ALWAYS_REQUIRE_OTP_PHONES.includes(cleanPhone)) {
    try {
      const localList = JSON.parse(localStorage.getItem('milo_verified_phones') || '[]');
      const filtered = Array.isArray(localList) ? localList.filter((p: string) => p !== cleanPhone) : [];
      localStorage.setItem('milo_verified_phones', JSON.stringify(filtered));
      if (localStorage.getItem('milo_verified_phone') === cleanPhone) {
        localStorage.removeItem('milo_verified_phone');
      }
      sessionStorage.removeItem('milo_verification_token');
      localStorage.removeItem('milo_verification_token');
    } catch {}
    return false;
  }

  // 1. Ưu tiên kiểm tra danh sách đã xác thực trên Backend Server để luôn làm mới verificationToken (hạn 15 phút)
  const endpoints = getBackendEndpoints();
  for (const baseUrl of endpoints) {
    try {
      const response = await fetch(`${baseUrl}/api/check-phone-verified?phone=${encodeURIComponent(cleanPhone)}`);
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.verified) {
          console.log(`[DEBUG][otpApi] checkPhoneVerifiedApi verified từ ${baseUrl}`);
          if (data.verificationToken) {
            saveVerificationToken(data.verificationToken);
          }
          markPhoneVerifiedLocal(cleanPhone);
          return true;
        }
        return false;
      }
    } catch (err) {
      console.warn(`[DEBUG][otpApi] Lỗi checkPhoneVerifiedApi ${baseUrl}:`, err);
    }
  }

  // 2. Dự phòng kiểm tra trong localStorage nếu tất cả kết nối tới Backend tạm thời gián đoạn
  try {
    const localList = JSON.parse(localStorage.getItem('milo_verified_phones') || '[]');
    if (Array.isArray(localList) && localList.includes(cleanPhone)) {
      console.log('[DEBUG][otpApi] Số điện thoại đã xác thực từ localStorage (dự phòng):', cleanPhone);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Đánh dấu số điện thoại đã xác thực vào localStorage
 */
export function markPhoneVerifiedLocal(phoneNumber: string) {
  try {
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone || ALWAYS_REQUIRE_OTP_PHONES.includes(cleanPhone)) return;
    localStorage.setItem('milo_verified_phone', cleanPhone);
    const localList = JSON.parse(localStorage.getItem('milo_verified_phones') || '[]');
    if (!localList.includes(cleanPhone)) {
      localList.push(cleanPhone);
      localStorage.setItem('milo_verified_phones', JSON.stringify(localList));
    }
  } catch {}
}
