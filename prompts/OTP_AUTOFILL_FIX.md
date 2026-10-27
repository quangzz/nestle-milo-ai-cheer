# Prompt cho agent: Hoàn thiện chức năng nhập / tự điền mã OTP (MILO)

## Bối cảnh
Repo: `E:\milo`. Frontend React + Vite + Tailwind (`src/`), backend Node (`server/`).
Luồng OTP: người dùng nhập SĐT → server gửi mã 6 số qua Abenla → người dùng nhập mã → xác thực.

- Frontend: `src/app/components/features/Frame4PhoneOtp.tsx` (có 2 bản giao diện: desktop `isDesktop` và mobile, ở bước `FRAME_5_OTP`).
- Backend: `server/services/smsService.js`. Hàm `sendOtpSms` gửi song song 2 kênh:
  - Zalo ZNS OTP: serviceTypeId `537`, brand `ZOTP`
  - Voice Call OTP: `527` / `VoiceOTP271`

  Hàm gọi cổng là `callAbenlaGateway(cleanPhone, otpCode, serviceTypeId, brandName, message?)`.
- Dự án tham chiếu đã chạy tốt: `E:\ntf2026`.
  - `src/app/pages/LoginPage.tsx`: dùng 1 ô `<input inputMode="numeric" maxLength={6}>`.
  - `backend/src/services/abenla.service.ts`: cũng gửi qua `537/ZOTP`, nội dung `Ma OTP Nutifood 2026 cua ban la: <code>. Ma co hieu luc trong 5 phut.`

  Trên ntf2026, điện thoại hiện gợi ý mã OTP để chạm vào là điền.

## Vấn đề người dùng báo
1. Trên MILO, điện thoại không gợi ý sẵn mã OTP như ntf2026.
2. Ô OTP gồm 6 ô riêng, phải chạm vào từng ô để nhập, rất bất tiện.

## Đã làm (commit `48c2312a94`), cần KIỂM TRA LẠI, không làm lại từ đầu
- Thay 6 ô `<input>` bằng **1 ô `<input>` trong suốt phủ lên ảnh khung 6 ô**. Các chữ số được hiển thị bằng 6 `<span>`.
  - Ô input có: `autoComplete="one-time-code"`, `inputMode="numeric"`, `pattern="[0-9]*"`, `maxLength={6}`, `autoFocus`.
  - Hàm `applyOtpValue` tách chữ số, cập nhật mảng `otp`, và tự gọi `verifyOtpCode` khi đủ 6 số.
  - Hàm `handleOtpPaste` lấy đúng cụm 6 số khi người dùng dán cả câu tin nhắn.
  - Có WebOTP (`navigator.credentials.get({ otp })`) cho Android Chrome. Phần này chỉ có tác dụng với SMS có dòng `@domain #code`.
- Backend: tin Zalo đổi từ chỉ `${otpCode}` sang `Ma OTP MILO cua ban la: ${otpCode}. Ma co hieu luc trong 5 phut.`. Tin Voice giữ nguyên.

## Việc cần làm
1. **Đọc kỹ** `Frame4PhoneOtp.tsx` và `smsService.js` ở trạng thái hiện tại, so với ntf2026.
2. **Chạy app và kiểm tra cả desktop lẫn mobile** (viewport 375px). Để tới bước OTP mà không gửi tin thật, dùng chế độ mock nếu có. Nếu chưa có, tạm stub `sendOtpApi` / `verifyOtpApi` ở local và KHÔNG commit stub. Kiểm tra:
   - Chạm vào bất kỳ vị trí nào trên khung 6 ô cũng focus được và bàn phím số hiện lên.
   - Gõ liền 6 số hiển thị đúng thứ tự vào 6 ô. Backspace xóa lùi đúng.
   - Dán `123456`, và dán `Ma OTP MILO cua ban la: 123456. Ma co hieu luc trong 5 phut.`: cả hai đều điền đúng `123456` rồi tự xác nhận.
   - Không có caret, highlight bôi đen, hay chữ của input thật bị lộ ra trên khung.
   - Không gọi xác thực 2 lần: thử vừa đủ 6 số (tự xác nhận) vừa bấm nút "Xác nhận" hoặc mũi tên Next của `StepProgressBar`. Nếu bị gọi 2 lần, thêm khóa chống gọi trùng, ví dụ `useRef` cờ đang xác thực, vì `isLoading` trong closure có thể cũ.
   - Sai mã thì báo lỗi, cho nhập lại được ngay. Nên xóa trắng 6 ô và focus lại input.
   - "Gửi lại mã" và "Đổi số điện thoại" vẫn hoạt động. Quay lại bước OTP thì input được reset.
3. **Cải thiện UX (nhỏ, giữ nguyên ảnh thiết kế):** khi input đang focus, đánh dấu ô kế tiếp cần nhập (gạch chân hoặc nhấp nháy nhẹ) để người dùng biết đang nhập ở đâu. Dùng state `isOtpFocused` cộng chỉ số `otpValue.length`.
4. **Kiểm tra backend:** gửi thử 1 OTP thật tới SĐT test (hỏi người dùng số nào), xem log `[ABENLA_GATEWAY_RES] [ZOTP]`.
   - Nếu Abenla trả lỗi vì nội dung không khớp template Zalo ZNS: báo lại cho người dùng, và đặt nội dung tin Zalo bằng biến env `ABENLA_ZALO_MESSAGE_TEMPLATE`, mặc định giữ câu hiện tại.
   - Không tự đổi về chỉ gửi số trơn khi người dùng chưa đồng ý.
5. Chạy `npx tsc --noEmit -p .`, `npx vite build` và `node -e "require('./server/services/smsService.js')"`. Cả ba phải không lỗi.

## Ràng buộc
- Không đổi ảnh/thiết kế (`/desktop-otp-group34.png`, `/desktop-otp-title-group33.png`, các nút).
- Không đổi logic xác thực phía server (`verifyOtp`, rate limit, `otpStore`, token HMAC).
- Không log SĐT đầy đủ hoặc mã OTP ở log mới.
- Viết code đúng phong cách file hiện tại (comment tiếng Việt, Tailwind class, `motion/react`).
- Không commit hay push khi chưa được người dùng cho phép.

## Lưu ý kỹ thuật (để agent hiểu đúng, tránh hứa sai với người dùng)
- iOS chỉ gợi ý mã "Từ Tin nhắn" khi mã đến bằng **SMS** (hoặc Mail). Android/Gboard gợi ý từ SMS hoặc từ mã vừa sao chép.
- Tin trong app Zalo **không** được hệ điều hành đọc. Nếu ntf2026 hiện gợi ý thì khả năng cao là do Abenla `537/ZOTP` chuyển sang SMS khi Zalo không gửi được, hoặc do người dùng sao chép mã từ thông báo Zalo. Hãy ghi rõ điều này trong báo cáo, đừng khẳng định chắc chắn.
- Nội dung tin phải có chữ như "OTP"/"ma" thì điện thoại mới nhận ra đó là mã xác thực.

## Hoàn thành khi
Báo lại cho người dùng:
- Danh sách file đã sửa.
- Kết quả từng mục kiểm tra ở bước 2: đạt hay không đạt, kèm ảnh chụp mobile và desktop.
- Kết quả gửi thử Zalo ở bước 4.
- Những gì còn phải thử trên iPhone/Android thật.
