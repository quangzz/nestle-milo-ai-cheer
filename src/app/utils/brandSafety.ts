/**
 * BRAND SAFETY FILTER (Theo Báo Cáo Kỹ Thuật Nội Bộ Brand Safety BTMH / Milo v2.2.0)
 * Kiểm duyệt 3 cấp độ đối với nội dung văn bản (Tên người dùng / Lời chúc)
 */

export interface BrandSafetyResult {
  isValid: boolean;
  flag?: string;
  errorMessage?: string;
  matchedKeyword?: string;
}

// 1. Chính trị & An ninh Quốc gia
const POLITICAL_KEYWORDS = [
  'cờ 3 sọc', 'cờ ba sọc', 'ba sọc', '3 sọc', 'việt nam cộng hòa', 'viet nam cong hoa',
  'vnch', 'phản động', 'phan dong', 'việt tân', 'viet tan', 'vịt tân', 'vit tan',
  'đảo chính', 'dao chinh', 'lật đổ', 'lat do', 'chính quyền', 'chinh quyen'
];

// 2. Thao túng câu lệnh AI (Prompt Injection)
const PROMPT_INJECTION_KEYWORDS = [
  'ignore previous instructions', 'ignore all instructions', 'bỏ qua hướng dẫn',
  'bo qua huong dan', 'bỏ qua quy tắc', 'bo qua quy tac', 'in ra system prompt',
  'print system prompt', 'you are now', 'hãy đóng vai', 'hay dong vai',
  'override instructions', 'jailbreak'
];

// 3. Quảng cáo, Spam, Cờ bạc
const SPAM_ADVERTISING_KEYWORDS = [
  'http://', 'https://', 'www.', '.com', '.vn', '.net', 'zalo.me', 'zalo:',
  'lo đề', 'lô đề', 'lo de', 'cờ bạc', 'co bac', 'game bài', 'game bai',
  'dịch vụ vay', 'dich vu vay', 'cho vay', 'kèo bóng', 'keo bong'
];

// 4. Mã độc & Script Hack
const SCRIPT_INJECTION_KEYWORDS = [
  '<script', 'javascript:', 'drop table', '<iframe', 'eval(', 'alert(', 'onerror='
];

// 5. Thương hiệu đối thủ
const COMPETITOR_KEYWORDS = [
  'pnj', 'sjc', 'doji', 'bảo tín minh châu', 'bao tin minh chau', 'btmc',
  'huy thanh', 'mi hồng', 'mi hong', 'ancarat', 'phú nhuận gold', 'phu nhuan gold',
  'ovaltine', 'ovaltin', 'dutch lady', 'cô gái hà lan', 'co gai ha lan',
  'vinamilk', 'th true milk', 'th truemilk', 'nutifood', 'lif kun', 'kun'
];

// 6. Từ ngữ thô tục, 18+, Chửi thề & Bạo lực
const OBSCENE_KEYWORDS = [
  'địt', 'dit', 'd1t', 'đụ', 'du', 'lồn', 'lon', 'lon\'', 'cặc', 'cac', 'cak',
  'buồi', 'buoi', 'bu0i', 'đĩ', 'di', 'cave', 'chịch', 'chich', 'nứng', 'nung',
  'phang', 'quay tay', 'thủ dâm', 'thu dam', 'dâm dục', 'dam duc', 'gái gọi', 'gai goi',
  'mại dâm', 'mai dam', 'dit me', 'dit con', 'dcm', 'dmm', 'clgt', 'vcl', 'vkl',
  'đéo', 'deo', 'đm', 'dm', 'cc', 'đb', 'db', 'đái', 'ỉa', 'cứt', 'cut',
  'khiêu dâm', 'khieu dam', 'đồi trụy', 'doi truy', 'sex', 's3x', 'hentai',
  'porn', 'p0rn', 'pr0n', 'xxx', 'nội y', 'noi y', 'nude', 'naked',
  'khỏa thân', 'khoa than', 'khoả thân',
  'giết', 'giet', 'chém', 'chem', 'đâm chết', 'dam chet', 'tự tử', 'tu tu', 'tự sát', 'tu sat'
];

/**
 * Chuẩn hóa chuỗi để so sánh (xóa dấu tiếng Việt, ký tự đặc biệt thừa)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchKeyword(rawText: string, normText: string, kw: string): boolean {
  const kwLower = kw.toLowerCase().trim();
  const kwNorm = normalizeString(kw);
  if (!kwNorm) return false;

  // Nếu keyword là cụm từ (có khoảng trắng)
  if (kwNorm.includes(' ')) {
    const escapedNorm = escapeRegex(kwNorm);
    const regexNorm = new RegExp('(^|\\s)' + escapedNorm + '(\\s|$)', 'i');
    if (regexNorm.test(normText)) return true;

    const escapedRaw = escapeRegex(kwLower);
    const regexRaw = new RegExp('(^|\\s)' + escapedRaw + '(\\s|$)', 'i');
    if (regexRaw.test(rawText)) return true;

    return false;
  }

  // Nếu keyword là từ đơn: So khớp chính xác từng từ độc lập (token match), tránh false-positive
  const rawTokens = rawText.split(/\s+/).filter(Boolean);
  const normTokens = normText.split(/\s+/).filter(Boolean);

  if (rawTokens.includes(kwLower)) return true;
  if (normTokens.includes(kwNorm)) return true;

  return false;
}

/**
 * Kiểm tra tính an toàn của tên người dùng theo Brand Safety
 */
export function validateRecipientName(name: string): BrandSafetyResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      errorMessage: 'Vui lòng nhập tên người cần cổ vũ.'
    };
  }

  const rawLower = name.toLowerCase().trim();
  const normalized = normalizeString(name);

  // 1. Kiểm tra Script Hack
  for (const kw of SCRIPT_INJECTION_KEYWORDS) {
    if (rawLower.includes(kw) || normalized.includes(kw)) {
      return {
        isValid: false,
        flag: 'script_injection',
        errorMessage: 'Nội dung chứa ký tự hoặc đoạn mã không hợp lệ.',
        matchedKeyword: kw
      };
    }
  }

  // 2. Kiểm tra Chính trị & An ninh Quốc gia
  for (const kw of POLITICAL_KEYWORDS) {
    if (matchKeyword(rawLower, normalized, kw)) {
      return {
        isValid: false,
        flag: 'political_violation',
        errorMessage: 'Nội dung vi phạm tiêu chuẩn an toàn chính trị và quy định pháp luật.',
        matchedKeyword: kw
      };
    }
  }

  // 3. Kiểm tra Prompt Injection
  for (const kw of PROMPT_INJECTION_KEYWORDS) {
    const kwNorm = normalizeString(kw);
    if (rawLower.includes(kw) || normalized.includes(kwNorm)) {
      return {
        isValid: false,
        flag: 'prompt_injection',
        errorMessage: 'Phát hiện hành vi thao túng hệ thống không hợp lệ.',
        matchedKeyword: kw
      };
    }
  }

  // 4. Kiểm tra Quảng cáo, Spam, Cờ bạc
  for (const kw of SPAM_ADVERTISING_KEYWORDS) {
    if (kw.startsWith('http') || kw.includes('.') || kw.includes(':')) {
      if (rawLower.includes(kw) || normalized.includes(kw)) {
        return {
          isValid: false,
          flag: 'spam_advertising',
          errorMessage: 'Nội dung chứa liên kết hoặc thông tin quảng cáo không được phép.',
          matchedKeyword: kw
        };
      }
    } else if (matchKeyword(rawLower, normalized, kw)) {
      return {
        isValid: false,
        flag: 'spam_advertising',
        errorMessage: 'Nội dung chứa liên kết hoặc thông tin quảng cáo không được phép.',
        matchedKeyword: kw
      };
    }
  }

  // 5. Kiểm tra Thương hiệu đối thủ
  for (const kw of COMPETITOR_KEYWORDS) {
    if (matchKeyword(rawLower, normalized, kw)) {
      return {
        isValid: false,
        flag: 'competitor_brand_violation',
        errorMessage: 'Nội dung chứa thương hiệu không thuộc phạm vi chương trình.',
        matchedKeyword: kw
      };
    }
  }

  // 6. Kiểm tra Từ ngữ thô tục, 18+, Bạo lực (Dùng token match, không dùng rawLower.includes để tránh false-positive với Long, Dung, Diễm,...)
  for (const kw of OBSCENE_KEYWORDS) {
    if (matchKeyword(rawLower, normalized, kw)) {
      return {
        isValid: false,
        flag: 'obscene_content',
        errorMessage: 'Nội dung chứa từ ngữ nhạy cảm, không phù hợp thuần phong mỹ tục.',
        matchedKeyword: kw
      };
    }
  }

  // 7. Kiểm tra ký tự hợp lệ (Chỉ cho phép chữ cái tiếng Việt, tiếng Anh và khoảng trắng)
  const validNameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;
  if (!validNameRegex.test(name.trim())) {
    return {
      isValid: false,
      flag: 'invalid_characters',
      errorMessage: 'Tên chỉ được chứa chữ cái tiếng Việt/tiếng Anh, không chứa số hoặc ký tự đặc biệt.'
    };
  }

  // 8. Giới hạn độ dài tên: 2 - 15 ký tự theo yêu cầu (phù hợp với tên tiếng Việt đầy đủ)
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return {
      isValid: false,
      flag: 'name_too_short',
      errorMessage: 'Tên quá ngắn, vui lòng nhập từ 2 đến 15 ký tự.'
    };
  }
  if (trimmed.length > 15) {
    return {
      isValid: false,
      flag: 'name_too_long',
      errorMessage: 'Tên tối đa 15 ký tự.'
    };
  }

  // 9. Chặn ký tự lặp liên tiếp >= 3 lần (VD: aaa, bbb, zzz, ...)
  if (/([a-zA-ZÀ-ỹ])\1{2,}/i.test(trimmed)) {
    return {
      isValid: false,
      flag: 'repeated_characters',
      errorMessage: 'Tên không hợp lệ (chứa ký tự lặp lại bất thường).'
    };
  }

  // 10. Chặn danh sách tên giả / placeholder / dummy spam
  const DUMMY_NAMES = [
    'xyz', 'abc', 'test', 'demo', 'admin', 'null', 'undefined', 'asdf', 'qwer', 'zxcv',
    'xxx', 'yyy', 'zzz', 'abcdxyz', 'xyzabc', 'ahihi', 'haizz', 'abcd', '123'
  ];
  if (DUMMY_NAMES.includes(rawLower) || DUMMY_NAMES.includes(normalized)) {
    return {
      isValid: false,
      flag: 'dummy_name',
      errorMessage: 'Vui lòng nhập tên người thật (Ví dụ: Minh, Nam, Linh, Hà, ...).'
    };
  }

  // 11. Chặn các chuỗi gõ phím bàn phím liên tiếp (Keyboard spam)
  const KEYBOARD_SPAM = [
    'abcd', 'bcde', 'cdef', 'defg', 'efgh', 'fghi', 'ghij', 'hijk', 'ijkl', 'jklm', 'klmn', 'lmno', 'mnop', 'nopq', 'opqr', 'pqrs', 'qrst', 'rstu', 'stuv', 'tuvw', 'uvwx', 'vwxy', 'wxyz',
    'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl',
    'qwer', 'wert', 'erty', 'rtyu', 'tyui', 'yuio', 'uiop',
    'zxcv', 'xcvb', 'cvbn', 'vbnm',
    'qazw', 'wsxe', 'edcr', 'rfvt', 'tgby', 'yhnm'
  ];
  for (const spam of KEYBOARD_SPAM) {
    if (rawLower.includes(spam) || normalized.includes(spam)) {
      return {
        isValid: false,
        flag: 'keyboard_spam',
        errorMessage: 'Tên không hợp lệ (vui lòng nhập tên người thật).'
      };
    }
  }

  // 12. Kiểm tra từng từ: Bắt buộc phải có ít nhất 1 nguyên âm
  const words = trimmed.split(/\s+/);
  const VOWELS = /[aeiouyàáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽềềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  for (const w of words) {
    if (!VOWELS.test(w)) {
      return {
        isValid: false,
        flag: 'missing_vowels',
        errorMessage: 'Tên không hợp lệ (thiếu nguyên âm).'
      };
    }
  }

  // 13. Chặn chuỗi phụ âm liên tiếp >= 4 phụ âm (VD: bcdf, lkjh, strn, ...)
  const normNoAccents = rawLower
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  if (/[^aeiouy\s]{4,}/i.test(normNoAccents)) {
    return {
      isValid: false,
      flag: 'consonant_cluster_gibberish',
      errorMessage: 'Tên không hợp lệ (chuỗi phụ âm bất thường).'
    };
  }

  return {
    isValid: true
  };
}
