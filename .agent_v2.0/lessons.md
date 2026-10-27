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
