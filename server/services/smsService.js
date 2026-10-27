const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Cấu hình Abenla SMS API
const ABENLA_API_URL = process.env.ABENLA_API_URL || 'https://api.abenla.com/api/SendSms';
const ABENLA_LOGIN_NAME = process.env.ABENLA_LOGIN_NAME || '';
const ABENLA_PASSWORD = process.env.ABENLA_PASSWORD || '';

// Cổng Zalo ZNS OTP (Ưu tiên số 1)
const ZALO_SERVICE_TYPE_ID = process.env.ABENLA_ZALO_SERVICE_TYPE_ID || '537';
const ZALO_BRAND_NAME = process.env.ABENLA_ZALO_BRAND_NAME || 'ZOTP';

// Cổng Voice Call OTP (Fallback sau 20s nếu chưa nhập OTP)
const VOICE_SERVICE_TYPE_ID = process.env.ABENLA_VOICE_SERVICE_TYPE_ID || '527';
const VOICE_BRAND_NAME = process.env.ABENLA_VOICE_BRAND_NAME || 'VoiceOTP271';

// Template tin nhắn Zalo OTP (Hỗ trợ cấu hình qua biến môi trường ABENLA_ZALO_MESSAGE_TEMPLATE)
const DEFAULT_ZALO_MESSAGE_TEMPLATE = 'Ma OTP MILO cua ban la: {OTP}. Ma co hieu luc trong 5 phut.';

function formatZaloMessage(otpCode) {
  const tpl = process.env.ABENLA_ZALO_MESSAGE_TEMPLATE || DEFAULT_ZALO_MESSAGE_TEMPLATE;
  return tpl.replace(/\{OTP\}|\$\{otpCode\}/g, otpCode);
}

// Bộ nhớ đệm lưu trữ OTP và Timer Fallback (In-Memory Cache)
const otpStore = new Map();

// Tệp lưu danh sách các số điện thoại đã xác thực OTP thành công
const VERIFIED_PHONES_FILE = path.join(__dirname, '../verified_phones.json');

// In-Memory Set Cache cho danh sách số điện thoại đã xác thực (O(1) lookup, 0ms disk read)
let verifiedPhonesCacheSet = null;

// Danh sách các số điện thoại dùng để kiểm thử luồng OTP (luôn luôn bắt buộc nhập OTP, không lưu nhớ trạng thái)
const ALWAYS_REQUIRE_OTP_PHONES = new Set(['0963253930', '0986653614']);

/**
 * Khôi phục danh sách số đã xác thực từ result.json của các job (dùng khi verified_phones.json bị hỏng/rỗng)
 */
function rebuildVerifiedPhonesFromJobs() {
  const set = new Set();
  const jobsDir = path.join(__dirname, '../jobs');
  try {
    for (const dir of fs.readdirSync(jobsDir)) {
      try {
        const r = JSON.parse(fs.readFileSync(path.join(jobsDir, dir, 'result.json'), 'utf-8'));
        const clean = formatPhoneNumber(r.phoneNumber || r.phone || '');
        if (clean.length === 10 && !ALWAYS_REQUIRE_OTP_PHONES.has(clean)) set.add(clean);
      } catch (_) {}
    }
  } catch (e) {
    console.error('[SMS] Không thể quét thư mục jobs để khôi phục verified phones:', e.message);
  }
  console.log(`[DEBUG][SMS] Đã khôi phục ${set.size} số điện thoại đã xác thực từ dữ liệu job.`);
  return set;
}

/**
 * Ghi file nguyên tử: ghi ra file tạm rồi rename -> không bao giờ để lại file rỗng khi ổ đĩa đầy
 */
function writeVerifiedPhonesAtomic(set) {
  const tmpFile = `${VERIFIED_PHONES_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(Array.from(set), null, 2), 'utf-8');
  fs.renameSync(tmpFile, VERIFIED_PHONES_FILE);
}

function getVerifiedPhonesSet() {
  if (verifiedPhonesCacheSet !== null) {
    return verifiedPhonesCacheSet;
  }
  try {
    if (fs.existsSync(VERIFIED_PHONES_FILE)) {
      const data = fs.readFileSync(VERIFIED_PHONES_FILE, 'utf-8');
      const list = JSON.parse(data);
      const filtered = Array.isArray(list) ? list.filter(p => !ALWAYS_REQUIRE_OTP_PHONES.has(p)) : [];
      verifiedPhonesCacheSet = new Set(filtered);
      return verifiedPhonesCacheSet;
    }
  } catch (e) {
    console.error('[SMS] Lỗi nạp verified_phones.json, tiến hành khôi phục từ dữ liệu job:', e.message);
    verifiedPhonesCacheSet = rebuildVerifiedPhonesFromJobs();
    try { writeVerifiedPhonesAtomic(verifiedPhonesCacheSet); } catch (_) {}
    return verifiedPhonesCacheSet;
  }
  verifiedPhonesCacheSet = new Set();
  return verifiedPhonesCacheSet;
}

function getVerifiedPhones() {
  return Array.from(getVerifiedPhonesSet());
}

function saveVerifiedPhone(phone) {
  try {
    const clean = formatPhoneNumber(phone);
    if (ALWAYS_REQUIRE_OTP_PHONES.has(clean)) {
      console.log(`[SMS] Số ${clean} thuộc danh sách kiểm thử (luôn luôn yêu cầu OTP), bỏ qua lưu vĩnh viễn.`);
      return;
    }
    const set = getVerifiedPhonesSet();
    if (!set.has(clean)) {
      set.add(clean);
      writeVerifiedPhonesAtomic(set);
      console.log(`[VERIFIED_PHONE_SAVED] Đã lưu số ${clean} vào danh sách xác thực vĩnh viễn (In-Memory + Disk).`);
    }
  } catch (e) {
    console.error('[SMS] Lỗi lưu verified phone:', e.message);
  }
}

function isPhoneAlreadyVerified(phone) {
  const clean = formatPhoneNumber(phone);
  if (ALWAYS_REQUIRE_OTP_PHONES.has(clean)) {
    return false; // Số kiểm thử luôn luôn yêu cầu gửi và nhập OTP
  }
  return getVerifiedPhonesSet().has(clean);
}

/**
 * Tính mã sign bằng thuật toán MD5 của SendSmsPassword
 */
function getAbenlaSign(password) {
  if (!password) return '';
  return crypto.createHash('md5').update(password).digest('hex');
}

/**
 * Chuẩn hóa số điện thoại Việt Nam (loại bỏ khoảng trắng, dấu, chuyển +84/84 thành 0xxxxxxxxx)
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.toString().replace(/\D/g, '');
  if (clean.startsWith('84') && clean.length >= 11) {
    clean = '0' + clean.slice(2);
  }
  if (!clean.startsWith('0') && clean.length === 9) {
    clean = '0' + clean;
  }
  return clean;
}

/**
 * Sinh mã OTP 6 chữ số ngẫu nhiên theo chuẩn mật mã học CSPRNG (CWE-330 compliant)
 */
function generateOtpCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hàm gửi yêu cầu API sang Abenla theo từng serviceTypeId và brandName cụ thể
 */
async function callAbenlaGateway(cleanPhone, otpCode, serviceTypeId, brandName, message = `${otpCode}`) {
  const password = process.env.ABENLA_PASSWORD || ABENLA_PASSWORD;
  const loginName = process.env.ABENLA_LOGIN_NAME || ABENLA_LOGIN_NAME;
  const sign = getAbenlaSign(password);
  const smsGuid = crypto.randomUUID ? crypto.randomUUID() : `sms_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  const queryParams = new URLSearchParams({
    loginName: loginName,
    sign: sign,
    serviceTypeId: serviceTypeId,
    phoneNumber: cleanPhone,
    message: message,
    brandName: brandName,
    callBack: 'false',
    smsGuid: smsGuid
  });

  const requestUrl = `${ABENLA_API_URL}?${queryParams.toString()}`;
  console.log(`[ABENLA_GATEWAY] [${brandName} - Type ${serviceTypeId}] Sending to ${cleanPhone} (OTP: ${otpCode})`);

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const responseText = await response.text();
    console.log(`[ABENLA_GATEWAY_RES] [${brandName}] Status: ${response.status}, Body: ${responseText}`);
    
    let data = null;
    try { data = JSON.parse(responseText); } catch {}
    
    if (data && data.Code === 106) {
      return { success: true, code: 106, message: 'Success', raw: responseText };
    }
    if (data && data.Code === 104) {
      console.error(`\n⚠️ [ABENLA_WHITELIST_REQUIRED] Mã lỗi 104 (CanNotAccess): IP máy chủ VM (136.85.20.35) chưa được cấp quyền (Whitelist) trong trang quản trị Abenla portal của tài khoản ${loginName}!`);
      return { success: false, code: 104, error: 'IP_NOT_WHITELISTED', raw: responseText };
    }
    return { success: false, code: data?.Code, error: data?.Message || responseText };
  } catch (error) {
    console.error(`[ABENLA_GATEWAY_ERR] [${brandName}] Error:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi mã OTP:
 * Ưu tiên gửi Zalo ZNS OTP (537 - ZOTP) trước để tiết kiệm chi phí.
 * Chỉ tự động fallback sang Cuộc gọi Voice OTP (527 - VoiceOTP271) khi kênh Zalo thất bại.
 * @param {string} phoneNumber - Số điện thoại người nhận
 * @returns {Promise<{ success: boolean, otp?: string, messageId?: string, error?: string }>}
 */
async function sendOtpSms(phoneNumber) {
  const cleanPhone = formatPhoneNumber(phoneNumber);

  // 1. Kiểm tra chống SMS Bombing / Toll Fraud: Giới hạn tối thiểu 45 giây giữa 2 lần gửi trên cùng 1 SĐT
  const existing = otpStore.get(cleanPhone);
  if (existing && existing.lastSentAt && (Date.now() - existing.lastSentAt < 45 * 1000)) {
    const waitSec = Math.ceil((45 * 1000 - (Date.now() - existing.lastSentAt)) / 1000);
    return {
      success: false,
      error: `Vui lòng đợi thêm ${waitSec} giây trước khi yêu cầu gửi lại mã OTP cho số này.`
    };
  }

  const otpCode = generateOtpCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // Hết hạn sau 5 phút

  // Lưu vào otpStore
  otpStore.set(cleanPhone, {
    otp: otpCode,
    expiresAt,
    lastSentAt: Date.now(),
    attempts: 0,
    verified: false
  });

  const maskedPhone = cleanPhone.length >= 7
    ? cleanPhone.slice(0, 3) + '****' + cleanPhone.slice(-3)
    : '***';

  console.log(`\n======================================================`);
  console.log(`[OTP_SEND] Ưu tiên gửi Zalo OTP (chỉ fallback sang Voice Call nếu Zalo lỗi)`);
  console.log(`[OTP_SEND] SĐT: ${maskedPhone} (Bảo mật thông tin người dùng)`);
  console.log(`======================================================\n`);

  // Bước 1: Ưu tiên gửi Zalo ZNS OTP (537) trước
  const zaloVal = await callAbenlaGateway(
    cleanPhone,
    otpCode,
    ZALO_SERVICE_TYPE_ID,
    ZALO_BRAND_NAME,
    formatZaloMessage(otpCode)
  );
  const zaloSuccess = Boolean(zaloVal && zaloVal.success);

  if (zaloSuccess) {
    console.log(`[OTP_SEND_RESULT] SĐT: ${maskedPhone} -> Zalo: OK (Bỏ qua Voice Call để tiết kiệm cước)`);
    return {
      success: true,
      message: 'Mã xác thực OTP đã được gửi qua tin nhắn Zalo.'
    };
  }

  // Bước 2: Nếu Zalo thất bại (không phải do lỗi IP 104), tự động fallback sang Cuộc gọi Voice OTP (527)
  let voiceVal = null;
  let voiceSuccess = false;
  if (zaloVal?.code !== 104) {
    console.warn(`[OTP_SEND_FALLBACK] SĐT: ${maskedPhone} -> Zalo thất bại (${zaloVal?.error || zaloVal?.code}), chuyển sang gọi Voice OTP...`);
    voiceVal = await callAbenlaGateway(cleanPhone, otpCode, VOICE_SERVICE_TYPE_ID, VOICE_BRAND_NAME);
    voiceSuccess = Boolean(voiceVal && voiceVal.success);
  }

  console.log(`[OTP_SEND_RESULT] SĐT: ${maskedPhone} -> Zalo: FAIL, Voice Call: ${voiceSuccess ? 'OK' : 'FAIL'}`);

  // Nếu cả 2 cổng đều thất bại
  if (!zaloSuccess && !voiceSuccess) {
    const isIpBlocked = (zaloVal?.code === 104) || (voiceVal?.code === 104);
    if (isIpBlocked) {
      console.error(`❌ [ABENLA_IP_BLOCKED] IP máy chủ hiện tại chưa được cấp quyền (Whitelist) trong trang quản trị Abenla portal!`);
      return {
        success: false,
        code: 104,
        error: 'Cổng gửi OTP bị từ chối truy cập (Mã lỗi 104: IP máy chủ chưa được whitelist trên Abenla portal).'
      };
    }

    const errMsg = voiceVal?.error || zaloVal?.error || 'Lỗi gửi tin nhắn qua cổng Abenla';
    return {
      success: false,
      error: `Không thể gửi mã OTP tới số điện thoại ${cleanPhone} (${errMsg}). Vui lòng thử lại sau.`
    };
  }

  return {
    success: true,
    message: 'Mã xác thực OTP đã được gửi qua cuộc gọi thoại.'
  };
}

/**
 * Xác thực mã OTP người dùng nhập
 * @param {string} phoneNumber 
 * @param {string} inputOtp 
 * @returns {{ isValid: boolean, message: string, cleanPhone?: string }}
 */
function verifyOtp(phoneNumber, inputOtp) {
  const cleanPhone = formatPhoneNumber(phoneNumber);
  const record = otpStore.get(cleanPhone);

  if (!record) {
    return {
      isValid: false,
      message: 'Chưa có mã OTP nào được gửi đến số điện thoại này. Vui lòng bấm Gửi lại mã.'
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(cleanPhone);
    return {
      isValid: false,
      message: 'Mã OTP đã hết hạn. Vui lòng lấy mã mới.'
    };
  }

  // Bắt buộc nhập chính xác 100% mã OTP động thật đã được sinh ra (Không dùng bypass)
  if (record.otp === inputOtp) {
    record.verified = true;
    saveVerifiedPhone(cleanPhone);
    otpStore.delete(cleanPhone); // Xóa sau khi dùng thành công
    return {
      isValid: true,
      cleanPhone,
      message: 'Xác thực OTP thành công!'
    };
  }

  record.attempts += 1;
  if (record.attempts >= 5) {
    otpStore.delete(cleanPhone);
    return {
      isValid: false,
      message: 'Bạn đã nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới.'
    };
  }

  return {
    isValid: false,
    message: `Mã OTP không chính xác. Bạn còn ${5 - record.attempts} lần thử.`
  };
}

/**
 * Sinh token xác thực OTP đã ký HMAC (Hạn 15 phút, dùng để cấp phép tạo video)
 */
function createVerificationToken(phoneNumber) {
  const cleanPhone = formatPhoneNumber(phoneNumber);
  const timestamp = Date.now();
  const secret = process.env.OTP_SECRET || 'milo_secure_otp_token_secret_2026';
  const data = `${cleanPhone}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${cleanPhone}.${timestamp}.${hmac}`;
}

/**
 * Kiểm tra tính hợp lệ của verification token
 */
function verifyVerificationToken(token) {
  if (!token || typeof token !== 'string') return { valid: false, error: 'Thiếu token xác thực OTP' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, error: 'Định dạng token xác thực không hợp lệ' };
  const [phone, timestampStr, hmac] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || (Date.now() - timestamp > 15 * 60 * 1000)) {
    return { valid: false, error: 'Phiên xác thực OTP đã hết hạn (15 phút). Vui lòng xác thực lại' };
  }
  const secret = process.env.OTP_SECRET || 'milo_secure_otp_token_secret_2026';
  const expectedHmac = crypto.createHmac('sha256', secret).update(`${phone}:${timestamp}`).digest('hex');
  const hmacBuf = Buffer.from(hmac);
  const expectedBuf = Buffer.from(expectedHmac);
  if (hmacBuf.length === expectedBuf.length && crypto.timingSafeEqual(hmacBuf, expectedBuf)) {
    return { valid: true, phone };
  }
  return { valid: false, error: 'Chữ ký token xác thực không hợp lệ' };
}

module.exports = {
  sendOtpSms,
  verifyOtp,
  createVerificationToken,
  verifyVerificationToken,
  formatPhoneNumber,
  isPhoneAlreadyVerified,
  saveVerifiedPhone
};

