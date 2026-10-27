# Lessons & Project Conventions

## Brand Typography Rule
- **Primary Typography Font:** `RoadRage` (`/fonts/RoadRage-Regular.ttf` từ `milo_material/font/RoadRage-Regular.ttf`).
- Áp dụng font `RoadRage` cho toàn bộ tiêu đề, slogan, câu chạy loading, button action và các thành phần mang tính nhận diện thương hiệu của chiến dịch MILO.
- Đã được khai báo trong `src/styles/fonts.css` (`@font-face { font-family: 'RoadRage'; ... }`) và `src/styles/theme.css` (`--font-roadrage: 'RoadRage', cursive, sans-serif`).

## Thử giọng khác (Voice Switching) & Polling Flow
- **Asynchronous State trong React:** Khi chuyển bước sang `FRAME_8_LOADING` để render giọng mới, không dựa vào state closure cũ; luôn truyền trực tiếp `voiceType` mới vào hàm `generateSongWithBackend(onProgress, nextVoice)` và gán `key={songResult?.videoUrl}` cho thẻ `<video>` kèm gọi `videoRef.current?.load()` để trình duyệt tải stream mới.
- **Rate Limit Exempt cho Polling & Stream:** Express `rateLimit` phải miễn trừ hoặc tăng trần cho các request polling `/api/jobs/:jobId/status` và stream file `.mp4`, `.mp3` để không gây ra lỗi HTTP 429 khi người chơi tạo nhiều video liên tiếp.
- **Tái sử dụng Avatar:** Khi đổi giọng với `lastJobId`, tái sử dụng `input_head.png` đã xử lý từ job trước để giảm thời gian xử lý và tiết kiệm tài nguyên.

## Căn Chỉnh Vị Trí Ghép Đầu (Head Positioning & Tracking) Theo Chấm Đỏ & Gạch Đỏ
- **Quy tắc cốt lõi (BẮT BUỘC):** Luôn tuân thủ 100% tọa độ tâm đầu bám theo **Chấm Đỏ (`dot_x`, `dot_y`)** và góc nghiêng cùng điểm cằm bám theo **Đuôi Gạch Đỏ (`chin_x`, `chin_y`, `angle`)** đã được animator đánh dấu trong từng frame của video base (`study_video_base.mp4`, `office_video_base.mp4`, `workout_video_base.mp4`).
- **Dữ liệu Tracking chuẩn:** `track_study.json`, `track_office.json`, `track_workout.json` trích xuất chính xác frame-by-frame vector giữa chấm đỏ và đáy gạch đỏ, đảm bảo avatar xoay và di chuyển bám sát chuyển động gốc khi tạo video hoặc bấm đổi giọng.
- **Độ cao cổ áo theo chủ đề:**
  - **WORKOUT (Tập luyện):** `y_offset = -35px` nâng phần đầu lên cao nổi bật.
  - **STUDY (Học tập):** `y_offset = 10px` dịch đầu xuống khớp viền cổ áo hoodie.
  - **WORK (Làm việc):** `y_offset = 24px` dịch đầu xuống thêm khớp sâu vào viền cổ áo sơ mi cà vạt.

## Triển Khai Backend Lên Linux VM & Xử Lý Mixed Content
- **Lệnh Python trên Linux:** Ubuntu mặc định chỉ có `python3`, các script Node.js gọi `spawn('python', ...)` sẽ bị lỗi `spawn python ENOENT`. Bắt buộc cài đặt `python-is-python3` hoặc tạo symlink `/usr/bin/python -> /usr/bin/python3`.
- **Phiên bản OpenCV Headless:** Tránh cài bản 5.x alpha (như `5.0.0.93`), bắt buộc dùng bản 4.x ổn định (`opencv-python-headless<5`) để có đầy đủ module `cv2.CascadeClassifier` và tính năng nhận diện khuôn mặt.
- **Cache Model AI U2Net:** Thư viện `rembg` sẽ tự tải model `u2net.onnx` (176MB) vào `~/.u2net/u2net.onnx` trong lần chạy đầu tiên. Nên kích hoạt chạy thử trước một lần để tránh làm trễ thời gian của người dùng thực tế.
- **HTTPS & Mixed Content:** Khi Frontend chạy trên HTTPS (Firebase Hosting: `https://milo-3b596.web.app`), nếu gọi API tới IP HTTP không có chứng chỉ SSL (`http://136.85.20.35`), trình duyệt (Chrome, Safari, Edge) sẽ chặn 100% request do vi phạm chính sách Mixed Content. Giải pháp là thiết lập Cloudflare Tunnel (`cloudflared tunnel`) chạy daemon vĩnh viễn qua PM2 trên VM để cấp endpoint HTTPS bảo mật toàn cầu có SSL.

## Bảo Mật Xác Thực OTP (SMS & Voice Gateway)
- **Quy tắc bảo mật OTP:** Tuyệt đối KHÔNG BAO GIỜ để mã bypass (như `123456` hay bất kỳ mã cứng nào) trong code xác thực, kể cả cho mục đích test/dev nếu user không yêu cầu. Luôn bắt buộc kiểm tra 100% khớp với mã OTP ngẫu nhiên động được sinh ra trong phiên.
- **Abenla SMS IP Whitelist:** Cổng Abenla API yêu cầu whitelist IP tĩnh của server gọi (`136.85.20.35`). Nếu IP chưa được whitelist, Abenla trả về lỗi 104 (`CanNotAccess`). Phải cấu hình IP trên portal Abenla, không dùng cửa hậu (backdoor).

## Brand Safety Tên Tiếng Việt & Độ Dài Tên
- **Quy tắc Token Match:** Tuyệt đối KHÔNG dùng `.includes()` cho các từ khóa nhạy cảm ngắn/từ đơn (như `lon`, `du`, `di`, `cac`, `cc`, `dm`, `db`,...). Việc dùng `.includes()` sẽ làm hỏng hàng loạt tên tiếng Việt thông dụng (ví dụ: `"long".includes("lon") === true`, `"dung".includes("du") === true`, `"diem".includes("di") === true`).
- **Cách so khớp chuẩn:** Tách chuỗi theo dấu cách thành danh sách tokens (`tokens = text.split(/\s+/)`). Từ đơn nhạy cảm chỉ vi phạm khi chính xác một token bằng từ khóa đó (`tokens.includes(kw)`). Cụm từ có khoảng trắng dùng regex ranh giới từ `(^|\s)keyword(\s|$)`.
- **Độ dài tên hợp lý:** Tên tiếng Việt gồm cả họ, tên đệm và tên gọi (như "Hoàng Long", "Khánh Linh", "Phương Nam") dài từ 8 đến 12 ký tự. Giới hạn độ dài phải là từ 2 đến 15 ký tự, không được khống chế ở 8 ký tự gây chặn tên thật của người dùng.

## Kiểm Duyệt Hình Ảnh Lãnh Tụ (Leader Image Moderation)
- **Bản chất mô hình MobileNetV3:** MobileNetV3 trích xuất feature vector tổng quát của toàn bộ ảnh (áo vest, cà vạt, phông nền studio). Do đó, người dùng nam mặc vest xanh thắt cà vạt chụp ảnh studio sẽ có Cosine Similarity rất cao (0.90 - 0.93) với ảnh chân dung mẫu của lãnh tụ cùng mặc vest xanh.
- **Ngưỡng nhận diện vi phạm chuẩn xác:**
  - Bắt ảnh lấy từ internet: Dùng perceptual hash `min_pdist <= 14`.
  - Bắt bằng Deep Learning feature: Bắt buộc kết hợp CẢ HAI `best_score >= 0.95` VÀ `min_pdist <= 18`. Tuyệt đối không dùng `best_score >= 0.90` đơn lẻ.
- **Quy trình kiểm duyệt khuôn mặt trong detect_face.py:** Sau khi đã crop được khuôn mặt người dùng (`pil_crop`), chỉ kiểm duyệt trên `pil_crop`. Tuyệt đối không fallback gọi lại trên toàn bộ ảnh gốc `file_path` nếu `pil_crop` đã an toàn.

## Tương Tác Header Trên Bản Mobile
- **Header là thành phần trang trí:** Header dải giấy và logo MILO trên mobile (`Header.tsx`) đóng vai trò nhận diện thương hiệu và trang trí khung hình, TUYỆT ĐỐI KHÔNG gắn `onClick={() => goToStepByIndex(1)}` hay bất kỳ sự kiện điều hướng nào.
- Luôn đặt `pointer-events-none` và bỏ `cursor-pointer` để tránh người dùng chạm tay vào góc trên màn hình bị nhảy quay về Step 1 làm mất tiến trình đang thao tác.

## Abenla SMS Gateway & Chuẩn Hóa Số Điện Thoại
- **Mã lỗi 104 (CanNotAccess) của Abenla:** Đây là lỗi do IP của máy chủ gửi API chưa được thêm vào IP Whitelist trên trang quản trị Abenla portal (`smsthuonghieu.com` / `client.abenla.com`). Khi gặp lỗi này, Abenla từ chối kết nối ngay lập tức và KHÔNG lưu số điện thoại vào hệ thống báo cáo.
- **Xử lý phản hồi trung thực:** Backend KHÔNG ĐƯỢC nuốt lỗi và tự ý trả về `{ success: true }` khi cả 2 cổng Zalo và Voice Call đều thất bại. Phải trả về thông báo lỗi rõ ràng để phía client và quản trị viên biết được cần cấu hình Whitelist IP `136.85.20.35`.
- **Chuẩn hóa số điện thoại người dùng:** Tự động loại bỏ khoảng trắng, dấu gạch ngang và chuyển đổi các đầu số quốc tế `+84` / `84` thành định dạng 10 số chuẩn `0xxxxxxxxx` trước khi kiểm tra độ dài và gửi sang API.

## Tải Video Trực Tiếp Tự Động Trên Safari iPhone & Các Thiết Bị (Kế Thừa MSB AI MUSIC GAME)
- **Cơ chế tải chuẩn:** Để Safari trên iPhone tự động kích hoạt hộp thoại tải tệp `.mp4` chuẩn của hệ thống ("Bạn có muốn tải về [fileName].mp4 không?"), KHÔNG dùng client-side fetch blob URL `<a href="blob:...">` (vì Safari iOS sẽ coi blob video là stream và mở full player).
- **Cách triển khai đồng bộ:**
  1. **Frontend:** Kích hoạt đồng bộ thẻ `<a target="_blank" download>` ngay trong sự kiện tap của người dùng:
     ```typescript
     const downloadUrl = `${backendBase}/api/jobs/download-video/${rawJobId}/${fileName}?firebaseUrl=${encodeURIComponent(videoUrl)}`;
     const link = document.createElement("a");
     link.href = downloadUrl;
     link.download = fileName;
     link.target = "_blank";
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     ```
  2. **Backend Express:** Endpoint `/api/jobs/download-video/:jobId/:fileName` trả về:
     - `Content-Type: video/mp4`
     - `Content-Length: [stat.size]`
     - `Content-Disposition: attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
     - `Cache-Control: no-cache`
     - KHÔNG trả về Range 206, KHÔNG redirect HTTP 302 (nếu file trên Cloud Storage thì dùng `axios` stream proxy thẳng về client).
  3. **Hành vi trên Safari iPhone:** Safari nhận header `Content-Disposition: attachment` $\to$ lập tức bật pop-up xác nhận tải tệp của Safari $\to$ chạm "Tải về" để lưu file `.mp4` vào thư mục Downloads của iPhone.

## Lời Bài Hát (Lyrics) Khổ 1 Chủ Đề STUDY & Timing
- **Đồng bộ giữa Audio và Video Lyrics:** Trong bài hát gốc chủ đề Học tập (STUDY), ca sĩ hát có chữ "Nhưng" ở câu thứ 2:
  1. `{NAME} ƠI CỐ LÊN! 1…2…1…2!`
  2. `LỊCH THI CỰC SIẾT! NHƯNG KHÔNG KIỆT SỨC!` (Bắt buộc có chữ "NHƯNG" để khớp 100% với giọng hát của audio gốc).
  3. `CỐ THÊM CHÚT NỮA, SẮP RA CHƠI RỒI!`
  4. `THÊM CÂU CUỐI THÔI, RA ĐÁP ÁN RỒI!`
- **Timing chạy lyrics chuẩn (khớp giọng đọc intro và ca sĩ):**
  - **Chủ đề STUDY (Học tập - chậm hơn 0.5s):**
    - Khổ 1: Chờ đến 2.1s mới bắt đầu sáng line 0, chuyển line 1 lúc 4.3s, line 2 lúc 6.3s, line 3 lúc 8.3s.
    - Khổ 2: Bắt đầu từ 10.4s, line 1 lúc 12.6s, line 2 lúc 14.9s.
  - **Chủ đề WORK & WORKOUT:**
    - Khổ 1: Chờ đến 1.6s, chuyển line 1 lúc 3.8s, line 2 lúc 5.8s, line 3 lúc 7.8s.
    - Khổ 2: Bắt đầu từ 9.9s, line 1 lúc 12.1s, line 2 lúc 14.4s.

## Tương Tác Nút 'Tạo Bài Mới' (Frame 9 Outcome)
- **Hành vi nút 'Tạo bài mới':** Trên màn hình kết quả hoàn thành (Frame 9):
  - Nút **"Tạo bài mới"** (`desktop-btn-taobaimoi.png` / `btn-create-new.png`): Chuyển thẳng về **Trang tải ảnh lên** (`FRAME_6_INFO`), xóa ảnh cũ để người dùng tải ảnh/chụp selfie mới và nhập tên người nhận mới. TUYỆT ĐỐI KHÔNG quay về trang chọn chủ đề hay bắt xác thực OTP lại.
  - Nút **"Thử giọng khác"** (`desktop-btn-thugiong.png` / `btn-change-voice.png`): Chuyển đổi sang giọng AI tiếp theo (`01 -> 02 -> 03 -> 04 -> 01`) và chuyển sang `FRAME_8_LOADING` để render ngay giọng khác với ảnh và chủ đề hiện tại.

## Cơ Chế Biến `{default}` Trong Nestlé Platform.sh Routes
- Trong file cấu hình `.platform/routes.yaml`:
  `'https://cungmilocovutoicung.{default}/': type: upstream, upstream: 'milo:http'`
- **Giá trị của `{default}`:**
  - Nhánh Feature (`featuremilo-2026`): `{default}` = `featuremilo-2026-mtkjkta-ljf6eaf47kp6q.au.platformsh.site`.
  - Nhánh Production (`master`): `{default}` = `giadinhnestle.com.vn`.
- Do đó, link xem trước ở nhánh feature là `https://cungmilocovutoicung.featuremilo-2026-mtkjkta-ljf6eaf47kp6q.au.platformsh.site/`. Chỉ khi code được merge lên `master`, đường dẫn mới chuyển thành `https://cungmilocovutoicung.giadinhnestle.com.vn/`.

## Bản Ghi DNS CNAME & Cấp Phát Chứng Chỉ SSL/TLS Let's Encrypt Trên Platform.sh
- **Nguyên nhân lỗi HTTP01 Challenge:** Khi thêm một domain mới vào `routes.yaml` (ví dụ `cungmilocovutoicung.giadinhnestle.com.vn`), Platform.sh Bot sẽ kích hoạt tiến trình ACME HTTP01 Challenge để xin cấp chứng chỉ SSL từ Let's Encrypt.
- **Yêu cầu điều kiện tiên quyết:** Phải có bản ghi DNS **CNAME** trỏ tên miền về máy chủ Platform.sh (`master-7rqtwti-ljf6eaf47kp6q.au.platformsh.site` hoặc `ljf6eaf47kp6q.edge.platform.sh`) **TRƯỚC HOẶC NGAY KHI MERGE CODE**.
- Nếu DNS chưa được trỏ, Let's Encrypt không thể verify gateway và ghi nhận lỗi:
  `Error validating domain: Couldn't complete challenge [HTTP01: There was a problem with a DNS query during identifier validation]`
- Fastly Edge Router sẽ trả về lỗi `HTTP 421 Misdirected Request` vì hostname không khớp với bất kỳ SAN nào trong chứng chỉ TLS hiện tại.

## Bộ Đệm 7 Lớp (7-Layer Cache) Phía Backend Milo Engine
1. **Lớp 1 (DNS & In-Memory Verified Phones Cache):** Cache danh sách số điện thoại đã xác thực bằng Set memory $O(1)$.
2. **Lớp 2 (Avatar Head Reuse Cache):** Tái sử dụng `input_head.png` khi đổi giọng với cùng `lastJobId`.
3. **Lớp 3 (Voice Intro Audio Cache):** Lưu trữ file mp3 giọng đọc AI theo hash MD5 của `[name + voiceType]`.
4. **Lớp 4 (Mixed Audio Cache):** Lưu trữ bản audio hòa âm đã ghép theo hash `[name + voiceType + topic]`.
5. **Lớp 5 (Pre-extracted Neck Tracking Cache):** JSON frame-by-frame nạp sẵn trong bộ nhớ RAM.
6. **Lớp 6 (FFmpeg Concurrency Queue):** Giới hạn tối đa 2 job render nặng đồng thời (`MAX_CONCURRENT_JOBS = 2`).
7. **Lớp 7 (Cloud Storage Mirroring):** Đồng bộ trực tiếp thành phẩm lên Firebase Storage để phân phối CDN toàn cầu.

## Bài Học An Ninh Mã Nguồn & Tiêu Chuẩn URAH Network (2026)
1. **Khử rò rỉ Secret trong Git History (CWE-798):**
   - Xóa key khỏi file code hiện tại là chưa đủ; khóa bí mật vẫn tồn tại trong lịch sử commit (`git log -S "sk_"`).
   - Bắt buộc kiểm tra Git commit tree trước khi bàn giao và revoke/rotate API key bị lộ trên trang quản trị nhà cung cấp.
2. **Bảo mật Cầu Nối Frontend - Backend (OWASP API Top 10):**
   - Tuyệt đối không hardcode địa chỉ IP Public thô (`http://136.85.20.35`) hoặc domain tunnel tạm thời vào client code.
   - Sử dụng biến môi trường duy nhất (`VITE_BACKEND_URL`) qua HTTPS để chống lộ máy chủ VM và tránh lỗi trình duyệt chặn **Mixed Content**.
3. **Phòng chống Tiêu hao Tài nguyên (Denial of Wallet / CWE-306):**
   - Các API render nặng (FFmpeg / AI TTS) phải có xác thực token phía server, không chỉ dựa vào luồng UI của frontend để chống spam cạn kiệt tài khoản API.
4. **Khóa CORS và CSPRNG (API7:2023 & CWE-330):**
   - Khóa CORS theo whitelist domain chính thức, không mở `*`.
   - Sinh OTP và Token bắt buộc dùng `crypto.randomInt` hoặc `crypto.randomBytes`, không dùng `Math.random()`.

## Xử Lý Tải File Video MP4: Chuẩn Hóa Job ID Prefix (`job_`) & Whitelist Cloud Proxy
- **Vấn đề lệch Prefix Job ID:** Khi lưu trữ trên ổ đĩa, backend đặt thư mục là `JOBS_DIR/job_xxx/output.mp4`. Nếu endpoint download chỉ cắt prefix `job_` (`replace(/^job_/, '')`) rồi tìm trong `JOBS_DIR/xxx/`, file video thực tế sẽ bị bỏ qua và dẫn tới phản hồi HTTP 404: `{"success":false,"message":"Video chưa sẵn sàng hoặc không tìm thấy."}`.
- **Giải pháp ứng viên đường dẫn (Candidate Paths):** Trong `handleDownloadVideo`, luôn kiểm tra cả 3 định dạng: `normalizedJobId` (có `job_`), `inputJobId`, và `rawJobId` (không có `job_`), đồng thời kiểm tra cả `output.mp4` lẫn `final.mp4`.
- **Whitelist Cloud Proxy an toàn (SSRF Prevention):** Mở rộng danh sách domain được phép stream proxy video ngoài Firebase Storage gồm cả domain Cloudflare Tunnel (`*.trycloudflare.com`), Platform.sh (`*.platformsh.site`), Nestlé portal (`*.giadinhnestle.com.vn`), và internal host để fallback mượt mà khi video đã tải lên Cloud CDN.
- **Header Attachment cho iOS Safari:** Giữ nguyên header `Content-Disposition: attachment; filename="[Tên].mp4"`, `Content-Type: video/mp4`, `Accept-Ranges: bytes` để Safari iOS hiển thị hộp thoại tải về chuẩn của hệ thống ("Bạn có muốn tải về...").

## Sự cố Tải Video 12/10/2026: Ổ Đĩa VM Đầy -> Video Demo `song_` -> 404
- **Chuỗi nguyên nhân thật:** ổ VM đầy 100% (21GB `jobs/`) -> ENOSPC làm render/upload thất bại và ghi rỗng `verified_phones.json` -> `/api/generate-cheer` trả 401 -> frontend âm thầm rơi về `generateSongResult()` (id `song_...`, videoUrl tương đối `/demo_office.mp4`) -> nút Tải về gửi `song_...` lên backend -> 404.
- **Luôn đọc log PM2 trên VM** (`ssh -i ~/.ssh/google_compute_engine Admin@136.85.20.35`, `~/.pm2/logs/milo-backend-*.log`) trước khi sửa; test bằng curl trên máy local KHÔNG phản ánh request thật của iPhone.
- **Firebase Storage là nguồn chính thức của mọi video:** download ưu tiên `result.firebaseStorage['output.mp4']` -> file local -> videoUrl client. Upload Firebase retry 3 lần; không bao giờ trả URL `http://localhost` cho client.
- **Chống tái diễn:** server tự dọn media job > 48h đã có bản Firebase (mỗi 6h); `verified_phones.json` ghi nguyên tử (tmp + rename) và tự khôi phục từ `result.json` nếu hỏng.
- **Không dùng `new JobLogger(id)` để đọc** — constructor tự tạo thư mục job rác; đọc `result.json` trực tiếp.
- Deploy backend VM: VM KHÔNG có git repo, deploy bằng `scp` file vào `/var/www/milo/server` rồi `pm2 restart milo-backend --update-env`.

## Tải video trên iPhone phải LƯU THẲNG VÀO ALBUM ẢNH (user chỉnh 12/10/2026)
- Anchor + `Content-Disposition: attachment` trên iOS chỉ lưu vào app **Tệp (Files)**, KHÔNG vào Album ảnh -> user không chấp nhận.
- Chuẩn đúng (tham khảo `TranBaoPlatform/frontend/src/lib/mobile-download.ts`): `fetch` -> Blob -> `new File([blob], name, {type:'video/mp4'})` -> `navigator.share({ files: [file] })` -> bảng chia sẻ iOS -> "Lưu video".
- Chỉ share `{ files }` (không kèm text/title) để iOS luôn hiện mục "Lưu video".
- Firebase Storage không có CORS -> fetch blob qua endpoint backend `/api/jobs/download-video/...` (có CORS + Content-Length).
- `navigator.share` cần user activation: prefetch File khi vào Frame9 (`useSaveVideoToPhotos`); nếu bị `NotAllowedError` thì hiện bottom sheet để user chạm lần 2.
- Desktop/Android/webview không hỗ trợ Web Share -> giữ fallback anchor attachment.

## Frame 7 Chọn Chủ Đề: Tránh dùng DOM div để tạo Aura Glow trên Mobile WebKit (12/10/2026)
- **Vấn đề "khung chữ nhật":** Khi tạo hiệu ứng phát sáng cho item được chọn, nếu dùng thẻ div tuyệt đối (<div className="absolute inset-0 ... bg-[#28FF52]/20 rounded-full blur-md" />) kèm drop-shadow trên container cha, trên mobile WebKit (Safari, Messenger webview) sẽ bị render thành một chiếc hộp hình chữ nhật có nền xanh lục mờ và viền phát sáng chữ nhật sắc cạnh, phá vỡ thiết kế tự do của icon.
- **Giải pháp chuẩn:** Bỏ hoàn toàn thẻ div nền hình chữ nhật. Áp dụng hiệu ứng phát sáng drop-shadow-[0_0_16px_rgba(40,255,82,0.9)] drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] brightness-110 trực tiếp lên thẻ <img> PNG trong suốt. Bộ lọc CSS khi đặt trực tiếp vào ảnh sẽ ôm khít tuyệt đối 100% theo đường tròn icon và từng nét chữ mà không tạo bất kỳ khung hộp chữ nhật nào.

## Quản Lý Dung Lượng Ổ Đĩa Server (ENOSPC) & CORS Whitelist Testing (16/10/2026)
- **Nguyên nhân sự cố ENOSPC:** Quá trình render video Full HD MP4 và lưu ảnh tạm tạo ra hàng ngàn thư mục trong `/var/www/milo/server/jobs/` (~20-25MB mỗi job). Khi tích lũy hơn 1.700 jobs, ổ cứng VM (29GB) bị đầy 100% (0 bytes free). Mọi thao tác ghi log, lưu số điện thoại xác thực hoặc ghi file tạm đều bị `Error: ENOSPC: no space left on device, write`, khiến server crash và trả về lỗi kết nối / kích hoạt fallback.
- **Giải pháp dọn dẹp & Tự động hóa:** 
  1. Chỉ giữ lại 50 jobs mới nhất, dọn dẹp các thư mục cũ (`ls -td job_* | tail -n +51 | xargs -r rm -rf`) giải phóng ~19GB dung lượng.
  2. Thiết lập crontab tự động chạy mỗi 4 tiếng (`0 */4 * * *`) để giữ đĩa cứng luôn trống >15GB.
- **CORS Whitelist cho Testing & Production:**
  - Whitelist CORS trong `server.js` phải bao gồm cả các domain staging/testing: `*.web.app`, `*.firebaseapp.com`, `*.platformsh.site`, `*.giadinhnestle.com.vn`.
  - Không ném `callback(new Error('CORS blocked...'))` vì sẽ làm Express quăng lỗi 500 Unhandled Exception. Thay vào đó dùng `callback(null, false)`.

## Khôi Phục Thống Kê >3.000 Video Thành Phẩm, Sửa Lỗi Dashboard 148 & Tối Ưu Chi Phí OTP (16/10/2026)
- **Nguyên nhân hiển thị sai "148 game":**
  1. Trong `server/services/dashboardService.js`, hàm `getAllJobsData()` tham chiếu tới biến `verifiedPhones` mà chưa khai báo trong scope, gây lỗi `ReferenceError: verifiedPhones is not defined` (HTTP 500) khi có bất kỳ job nào chưa có `result.json` hoặc thiếu `phoneNumber`.
  2. Khi `/api/dashboard/stats` trả lỗi hoặc quá timeout 3.5s, `DashboardPage.tsx` rơi về dữ liệu mock cứng (`totalJobs: 148`).
  3. Cronjob dọn ổ đĩa cũ (`rm -rf job_*`) xóa cả thư mục job thay vì chỉ xóa các file media nặng (`.mp4`, `.mp3`, `.png`, `.jpg`), làm mất các file `result.json` và `status.json`.
- **Giải pháp triệt để:**
  1. Khai báo `const verifiedPhones = getVerifiedPhones();` trong `getAllJobsData()`, trích xuất `createdAt` chuẩn xác từ timestamp trong `jobId` (`job_<timestamp>_<hex>`), và nâng trần `limit` lên `10000`.
  2. Sửa cronjob trên VM chỉ xóa các file media nặng (`*.mp4`, `*.mp3`, `*.wav`, `*.png`, `*.jpg`, `*.jpeg`, `*.webm`, `log.txt`) của các job cũ, tuyệt đối giữ nguyên `result.json` và `status.json` (~1KB/file).
  3. Tái tạo đầy đủ **3.012 bản ghi job** (`3.010` video thành phẩm có link Firebase Storage sống 100%) và **2.648 số điện thoại xác thực** từ production log `/home/Admin/.pm2/logs/milo-backend-out-0.log`.
  4. Trong `server/services/smsService.js`, chuyển từ gửi song song cả Zalo ZNS + Voice Call (`Promise.allSettled`) sang **ưu tiên gửi Zalo ZNS (`537` / `ZOTP`) trước**, chỉ gọi **Voice Call (`527` / `VoiceOTP271`)** khi Zalo thất bại để tiết kiệm ~50-65% chi phí OTP Abenla.

## Giao Diện Dashboard Quản Trị: Tràn Toàn Màn Hình & Không Dùng Font RoadRage Cho Số Liệu (16/10/2026)
- **Vấn đề:**
  1. Thẻ `#root` trong `index.css` dùng `display: flex; justify-content: center;`, kết hợp với `max-w-7xl` và thiếu `w-full` trên `DashboardPage.tsx` khiến giao diện quản trị bị bó hẹp ở giữa màn hình.
  2. Biến `--font-sans` trong `theme.css` đặt `'RoadRage'` ở đầu danh sách, làm toàn bộ chữ số và bảng biểu trên Dashboard hiển thị bằng font cọ nét hẹp khó đọc.
- **Giải pháp:**
  1. Đặt `w-full max-w-[1920px]` cho `DashboardPage.tsx` và mở rộng lưới video lên 4 cột (`xl:grid-cols-4`) trên màn hình lớn.
  2. Gán trực tiếp `fontFamily: "'Montserrat', 'Inter', 'Segoe UI', Roboto, system-ui, sans-serif"` kèm `tabular-nums` và cỡ chữ lớn (`text-4xl lg:text-5xl xl:text-6xl font-black`) cho toàn bộ số liệu KPI, biểu đồ và bảng báo cáo trên Dashboard.

## Khắc Phục Lỗi CORS Cổng Dev Vite (5178) & Khởi Chạy Backend Local/VM (20/10/2026)
- **Nguyên nhân "Backend không hoạt động":**
  1. **Lỗi CORS Whitelist cứng:** `vite.config.ts` chỉ định chạy ở cổng `port: 5178`. Tuy nhiên, `server.js` chỉ whitelist các cổng cố định (`3000, 5000, 5005, 5173`), dẫn tới toàn bộ request từ frontend `localhost:5178` bị chặn CORS (thiếu header `Access-Control-Allow-Origin`), trình duyệt quăng lỗi `Failed to fetch`.
  2. **Tiến trình Backend Local chưa chạy:** Máy dev chưa bật process Node server ở cổng 5005 (`package.json` thiếu script chạy backend).
  3. **Thứ tự ưu tiên endpoint:** `getBackendEndpoints()` từng đặt biến `VITE_BACKEND_URL` lên đầu nên khi chạy dev local, frontend vẫn gọi sang remote tunnel thay vì local server.
- **Giải pháp:**
  1. Cập nhật CORS middleware trong `server.js` dùng hàm kiểm tra linh hoạt regex: chấp nhận mọi port của `localhost` / `127.0.0.1`, dải IP mạng LAN nội bộ (`192.168.x.x`, `10.x.x.x`), và tunnel domain `*.trycloudflare.com`. Đồng bộ và reload PM2 trên cả VM `136.85.20.35`.
  2. Thêm script `"server": "node server/server.js"` vào root `package.json` và khởi chạy server local tại `http://localhost:5005`.
  3. Cập nhật `getBackendEndpoints()` trong `otpApi.ts` ưu tiên kết nối local backend khi đang chạy môi trường nội bộ.

